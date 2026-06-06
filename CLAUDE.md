# CLAUDE.md — guidance for AI agents working in this repo

This file tells any AI coding agent (Claude, Gemini, etc.) how to work on **Qiáo**. Read it before
making changes. The full architecture is in [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md).

## What this project is
Qiáo (橋, "bridge") is a **cloud-based reconciliation + conflict-detection system** that converges a
patient's **Western Medicine (WM)** and **Traditional Chinese Medicine (TCM)** records into one view
and flags dangerous drug–herb interactions the two siloed systems miss. Built for the EuroTeQ × Hong
Kong Talent Engage hackathon (HealthTech track), elderly-care focus.

## Non-negotiable principles (do not violate)
1. **Not a chatbot / not a "copilot."** It is a reconciliation + conflict-detection system, never a
   Q&A assistant or diagnostic tool. Do not add chat/conversational features.
2. **Fuzzy vs. deterministic split.** An LLM (the **Gemini API**) handles only the *fuzzy* step —
   reading a free-text or photographed prescription into a structured drug/herb list, and
   normalizing names. The **safety verdict** (is there a conflict? how severe?) is a
   **deterministic lookup** against the curated interaction dataset — **never** model-generated.
3. **Explainable, sourced output.** Every conflict flag must carry: what, why (mechanism + clinical
   effect), severity, and source. No black-box results.
4. **Verified data only; no diagnostic claims.** Surface known interactions and hand the decision to
   a human (caretaker / clinician).
5. **Synthetic patient data only** in this prototype.

## Stack
- **Next.js (TypeScript)**, responsive web app.
- **Supabase** — cloud database, auth, file storage (single region; e.g. Singapore, closest to HK).
- **Gemini API** for fuzzy extraction — **server-side only**, key never exposed to the browser.
- **Vercel** for hosting.
- **Role-based access control:** elderly user, caretaker, TCM practitioner. A caretaker can only see
  patients they are explicitly linked to. Demo-grade auth is fine (seeded accounts) — do not burn
  time on production identity.

## Dataset contract (do NOT create the clinical data)
A **separate agent** produces the interaction dataset; this engine only *consumes* it. Build to two
JSON files (use a small mock in the same schema until the real one lands — it should be a drop-in
replacement):
- `entities.json`: `{ entity_id, preferred_name, type ("WM-drug"|"TCM-herb"|"TCM-formula"),
  drug_class, rxnorm_id, latin, pinyin, chinese, common_names[], active_constituents[] }`
- `interactions.json`: `{ id, agent_a_id, agent_b_id, interaction_class ("TCM-WM"|"WM-WM"|"TCM-TCM"),
  severity ("contraindicated"|"major"|"moderate"|"minor"), effect_direction, mechanism,
  clinical_effect, management, evidence_level ("established"|"probable"|"possible"|"theoretical"),
  sources[] }`

## Hero flow (make this work end-to-end first)
Intake (PDF upload + OCR, or text) → Gemini extract & normalize → map to entity ids → converge &
persist to cloud → **deterministic** conflict check → explainable severity-rated alerts → unified
passport (PDF export) + caretaker remote dashboard → tamper-evident audit log.
Hero demo pair: warfarin (WM) + a danshen/dong quai (TCM) formula → high-severity bleeding-risk flag.

## Working conventions
- **Every push updates `README.md`** — including the "Push log" section — so a teammate's LLM can
  follow exactly what changed and what the project uses.
- **Do not create files that weren't requested.** Keep changes scoped and minimal.
- Build the one hero flow excellently before adding breadth. Protect time for the README and the
  2-minute technical video.
- Keep secrets out of the client and out of git (`.env.local` is gitignored).
