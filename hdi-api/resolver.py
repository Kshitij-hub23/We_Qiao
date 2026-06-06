"""Deterministic name → entity resolution — the safety boundary of Qiáo.

WHY THIS LIVES IN THE ENGINE
============================
The LLM extraction step (`standardizer/`) only produces candidate name strings;
it carries no vocabulary and makes no matching decision. This module does the
matching, deterministically, against the curated `entity_aliases` index. Only
entity_ids resolved here are allowed to enter the conflict check — so this is
the boundary where fuzzy input becomes a known, sourced entity.

HOW A CANDIDATE IS RESOLVED
===========================
For each candidate string:
1. Normalize into a small set of variant forms (lowercase, trim, tone-stripped
   pinyin, and OpenCC simplified⇄traditional Chinese).
2. EXACT: if any variant is a key in the alias index, it resolves immediately
   (method="exact", score 1.0).
3. FUZZY fallback: otherwise run rapidfuzz over the in-memory alias set (trivial
   at a few hundred herbs — this is SQLite, not a vector DB) and take the best
   match above a floor. Fuzzy matches below the high-confidence threshold are
   flagged `requires_confirmation` so a human confirms them before they reach the
   check — they are NOT silently promoted.
4. Anything that still doesn't match is returned in `unmatched` — never dropped.

The alias index is rebuilt from the DB on each call; at this scale that is far
cheaper than the LLM round-trip that precedes it.
"""

from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from typing import Dict, List, Set, Tuple

from rapidfuzz import fuzz, process
from sqlalchemy.orm import Session

from database import Entity, EntityAlias

# Confidence policy for fuzzy matches (exact matches are always trusted).
#   >= FUZZY_HIGH      -> trusted, added automatically
#   [FUZZY_MIN, HIGH)  -> matched but requires_confirmation (human must confirm)
#   <  FUZZY_MIN       -> unmatched (too weak to suggest)
FUZZY_HIGH = 0.90
FUZZY_MIN = 0.75

# OpenCC converters for simplified⇄traditional Chinese. Built once at import.
# Applying both directions to every candidate (and at index-build time in seed.py)
# means a user typing either script resolves to the stored alias regardless of
# which script the dataset happens to use.
try:
    from opencc import OpenCC

    _S2T = OpenCC("s2t")
    _T2S = OpenCC("t2s")
except Exception:  # pragma: no cover - opencc optional at import time
    _S2T = _T2S = None


def strip_tones(text: str) -> str:
    """Remove pinyin tone marks (and other combining diacritics).

    "dānshēn" -> "danshen", "fùzǐ" -> "fuzi". Implemented via NFKD decomposition,
    dropping combining marks (Unicode category "Mn"). Harmless on ASCII / CJK.
    """
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


def normalize_variants(candidate: str) -> Set[str]:
    """Expand one raw candidate into the set of forms we try to match.

    Includes: the lowercased/trimmed form, its tone-stripped pinyin form, and
    OpenCC simplified⇄traditional conversions. The same normalization is mirrored
    at index-build time (seed.py) so exact lookups line up from both sides.
    """
    base = candidate.strip().lower()
    if not base:
        return set()
    variants = {base, strip_tones(base)}
    if _S2T is not None:
        for form in list(variants):
            variants.add(_S2T.convert(form))
            variants.add(_T2S.convert(form))
    variants.discard("")
    return variants


@dataclass
class Match:
    """One resolved candidate (or, when entity_id is None, a non-match)."""

    candidate: str
    entity_id: str
    preferred_name: str
    type: str
    score: float
    method: str  # "exact" | "fuzzy"
    requires_confirmation: bool


class _Index:
    """In-memory view of the alias table, built once per resolve call."""

    def __init__(self, db: Session) -> None:
        # alias (already lowercased in the DB) -> set of entity_ids it can mean.
        self.alias_to_ids: Dict[str, Set[str]] = {}
        for row in db.query(EntityAlias).all():
            self.alias_to_ids.setdefault(row.alias, set()).add(row.entity_id)
        # Stable list for rapidfuzz to score against.
        self.alias_keys: List[str] = sorted(self.alias_to_ids)
        # entity_id -> (preferred_name, type) for labelling matches.
        self.entities: Dict[str, Tuple[str, str]] = {
            e.entity_id: (e.preferred_name, e.type) for e in db.query(Entity).all()
        }

    def label(self, entity_id: str) -> Tuple[str, str]:
        return self.entities.get(entity_id, (entity_id, "unknown"))

    def pick(self, entity_ids: Set[str]) -> str:
        """Deterministically choose one entity_id when an alias is ambiguous."""
        return sorted(entity_ids)[0]


def resolve_candidates(db: Session, candidates: List[str]) -> Tuple[List[Match], List[str]]:
    """Resolve candidate strings to dataset entities.

    Returns (matched, unmatched). `matched` preserves input order and de-duplicates
    by resolved entity_id (the first candidate that lands on an entity wins).
    `unmatched` holds candidates that no variant resolved — surfaced, never dropped.
    """
    index = _Index(db)
    matched: List[Match] = []
    unmatched: List[str] = []
    seen_entities: Set[str] = set()

    for raw in candidates:
        if not raw or not raw.strip():
            continue
        match = _resolve_one(raw, index)
        if match is None:
            unmatched.append(raw.strip())
            continue
        if match.entity_id in seen_entities:
            continue  # same entity reached by two candidates — keep the first
        seen_entities.add(match.entity_id)
        matched.append(match)

    return matched, unmatched


def _resolve_one(candidate: str, index: _Index) -> Match | None:
    variants = normalize_variants(candidate)
    if not variants:
        return None

    # 1) Exact alias hit on any normalized variant.
    for variant in variants:
        ids = index.alias_to_ids.get(variant)
        if ids:
            entity_id = index.pick(ids)
            name, etype = index.label(entity_id)
            return Match(
                candidate=candidate.strip(),
                entity_id=entity_id,
                preferred_name=name,
                type=etype,
                score=1.0,
                method="exact",
                requires_confirmation=False,
            )

    # 2) Fuzzy fallback over the in-memory alias set; best variant wins.
    #
    # token_sort_ratio (not WRatio): it tolerates typos and word reordering but,
    # crucially, does NOT reward partial/substring token overlap the way WRatio
    # does. At scale (~2k aliases) WRatio scores junk like "totally unknown zzz"
    # at 90 by matching the bare token "unknown"; token_sort_ratio scores it ~54
    # while still scoring real typos (danshne→danshen, dong gui→dang gui) ~86–88.
    if not index.alias_keys:
        return None
    best_alias = None
    best_score = 0.0
    for variant in variants:
        result = process.extractOne(
            variant,
            index.alias_keys,
            scorer=fuzz.token_sort_ratio,
            score_cutoff=FUZZY_MIN * 100,
        )
        if result and result[1] > best_score:
            best_alias, best_score = result[0], result[1]

    if best_alias is None:
        return None

    score = best_score / 100.0
    entity_id = index.pick(index.alias_to_ids[best_alias])
    name, etype = index.label(entity_id)
    return Match(
        candidate=candidate.strip(),
        entity_id=entity_id,
        preferred_name=name,
        type=etype,
        score=round(score, 4),
        method="fuzzy",
        requires_confirmation=score < FUZZY_HIGH,
    )
