# Qiáo — Medication-Interaction Dataset (Proof-of-Concept)

Qiáo ("橋", *bridge*) is a prototype that reconciles a patient's **Western-medicine (WM)** and
**Traditional-Chinese-Medicine (TCM)** records and flags potential interactions. This dataset is
its clinical backbone: a small, dense, **fully-sourced and normalized** reference of drug/herb
interactions where *every* row is independently checkable.

> **This is a curated, sourced, ILLUSTRATIVE reference dataset for prototype/decision-support use — not a certified clinical knowledge base. Production use requires integration of a validated source (e.g., DrugBank/Lexicomp) and clinical review.**

"Gold standard" here means **provenance and accuracy, not size.** Every interaction cites at
least one real, fetched, re-verified source (PubMed PMID, DOI, or a named authoritative database
— NCCIH/NIH, MSK "About Herbs", FDA DailyMed labels, DDInter, peer-reviewed reviews). Nothing was
generated from memory; each citation was fetched live and then **independently re-checked by a
second adversarial auditor** that re-opened each PMID/DOI/DB record to confirm it resolves to the
stated paper and supports the claim.

## Status: PROOF-OF-CONCEPT — 51 rows across all three classes
| Class | Rows |
|---|---|
| **TCM-WM** (herb ↔ Western drug) | 30 |
| **WM-WM** (Western ↔ Western) | 12 |
| **TCM-TCM** (herb ↔ herb) | 9 |
| **Total** | **51** |

Built in two stages: 17 high-risk "hero" TCM-WM rows first (the demo centerpieces danshen↔warfarin
and dong quai↔warfarin), then a modest, hand-curated expansion to ~50 rows. This is **not** a bulk
ingestion — the expansion was researched and audited row-by-row at the same standard as the hero set.

## Files
| File | Contents |
|---|---|
| `entities.json` | Every drug, herb, and formula, normalized **exactly once** with a stable `entity_id` (46 entities: 22 TCM herbs, 24 WM drugs). |
| `interactions.json` | 51 interaction rows that reference entity IDs only (no duplicated name data). |
| `SOURCES.md` | Numbered list of all 129 unique sources with verified titles and which rows use them. |
| `README.md` | This file. |
| `coverage_report.md` | Counts per class & evidence level, hero coverage, gaps, lowest-confidence rows. |
| `validate_qiao.py` | Standalone validator (run `python3 validate_qiao.py`). |

## The three interaction classes
Every row is tagged with exactly one:
- **WM-WM** — Western drug ↔ Western drug. Here, clinically important elderly-polypharmacy pairs
  (warfarin↔NSAID/amiodarone/azole/macrolide, statin↔macrolide/fibrate/CCB, ACE-inhibitor↔K-sparing
  diuretic, digoxin↔amiodarone, clopidogrel↔PPI). All graded `established`.
- **TCM-WM** — Chinese herb/formula ↔ Western drug. *(The product's core value.)*
- **TCM-TCM** — Chinese herb ↔ Chinese herb. *Genuinely sparse and largely traditional/mechanistic.*
  Here, the classical "Eighteen Incompatibles" (十八反) and "Nineteen Antagonisms" (十九畏) pairs,
  each cited to peer-reviewed experimental/network studies and graded honestly (mostly `possible`,
  one `theoretical`). See `coverage_report.md` for the gap discussion.

## Normalization model
- Each real-world entity appears in `entities.json` once, with one stable `entity_id`.
  Interaction rows reference IDs only.
- Every TCM herb carries `latin` + `pinyin` + `chinese` + `common_names` (+ `active_constituents`)
  so the product can match free-text prescriptions written in any of those forms.
- WM drugs carry `drug_class` and a verified `rxnorm_id` (fetched from NIH RxNav).
- Where a source studied a class rather than a single drug, a **representative drug** is the entity
  and this is stated in the row text (e.g., amlodipine represents antihypertensives in INT-0010;
  glipizide/metformin represent antidiabetics).
- Species are modeled distinctly where it matters: American ginseng (*Panax quinquefolius*, E-0004,
  warfarin antagonism) vs Asian ginseng (*Panax ginseng*, E-0005, antidiabetic add-on & TCM-TCM pairs).
- No TCM formulas are present yet; when added, each will link to its component herb entities.

## Schemas

### `entities.json` (array)
```
{
  "entity_id": "E-0001",
  "preferred_name": "Warfarin",
  "type": "WM-drug" | "TCM-herb" | "TCM-formula",
  "drug_class": "anticoagulant",        // WM only
  "rxnorm_id": "11289",                 // WM only, verified via RxNav
  "latin": "Salvia miltiorrhiza",       // TCM herbs
  "pinyin": "danshen",                  // TCM
  "chinese": "丹参",                     // TCM
  "common_names": ["Coumadin"],
  "active_constituents": ["tanshinones"]// TCM, if known
}
```

### `interactions.json` (array)
```
{
  "id": "INT-0001",
  "agent_a_id": "E-0001",
  "agent_b_id": "E-0101",
  "interaction_class": "TCM-WM" | "WM-WM" | "TCM-TCM",
  "severity": "contraindicated" | "major" | "moderate" | "minor",
  "effect_direction": "potentiation" | "inhibition" | "additive" | "unknown",
  "mechanism": "short, in our own words",
  "clinical_effect": "short, observable",
  "management": "recommended action",
  "evidence_level": "established" | "probable" | "possible" | "theoretical",
  "sources": [ { "type": "PMID"|"DOI"|"DB", "ref": "<verified id>", "note": "what it shows" } ]
}
```

## Controlled vocabularies (use exactly these strings)
- **severity:** `contraindicated` | `major` | `moderate` | `minor`
- **evidence_level:**
  - `established` — multiple studies / strong consensus
  - `probable` — ≥1 clinical study or several case reports
  - `possible` — limited or conflicting evidence
  - `theoretical` — mechanism-based or traditional, no clinical interaction reports
- **effect_direction** (described from the affected drug's perspective):
  - `potentiation` — increases the drug's effect/toxicity
  - `inhibition` — reduces the drug's effect/levels
  - `additive` — same-direction pharmacodynamic add-on
  - `unknown`
- **type:** `WM-drug` | `TCM-herb` | `TCM-formula`
- **source.type:** `PMID` | `DOI` | `DB`

> Note on `effect_direction` for enzyme inducers: St John's Wort *induces* CYP3A4/P-gp, which
> *reduces* the affected drug's levels/effect. Per the vocabulary above (drug's perspective), those
> rows are coded `inhibition`; the molecular mechanism (induction) is stated in the `mechanism` text.

## How to read evidence honestly
Conflicting and negative sources are **kept**, not dropped, and are tagged *(negative/conflicting)*
in `SOURCES.md` and prefixed "Conflicting/negative:" in the row's source `note`. Several TCM-WM
pairs (ginkgo↔warfarin, garlic↔warfarin, danshen↔aspirin, ginger↔warfarin, Asian-ginseng↔warfarin)
have negative controlled trials alongside positive case/observational data; these are graded
`possible`. A low `evidence_level` reflects *certainty*, not severity.

## Validation
Run `python3 validate_qiao.py`. It checks: JSON parses; every `agent_a_id`/`agent_b_id` exists in
`entities.json`; only controlled-vocabulary values are used; every row has ≥1 source with a
non-empty `ref`; no self-interactions; no duplicate entity pairs. Current result: **PASS**
(46 entities, 51 interactions, 129 unique sources).

## Disclaimer (repeat)
Not a certified clinical knowledge base. Illustrative / decision-support prototype only.
Production use requires a validated commercial source and clinical review. Always defer to a
pharmacist or physician for patient care.
