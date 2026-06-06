# Qiáo (橋) — TCM / WM Medication Safety Bridge

A cloud-based reconciliation and **conflict-detection system** for elderly care in Hong Kong. It
converges a patient's **Western Medicine (WM)** and **Traditional Chinese Medicine (TCM)** records
into one view and flags dangerous drug–herb interactions that the two siloed systems miss.

> Built for the EuroTeQ × Hong Kong Talent Engage hackathon (HealthTech track).
> Repository: https://github.com/Kshitij-hub23/We_Qiao

---

## What it is (and is not)

- It **is** a reconciliation + conflict-detection tool. It surfaces *known, sourced* interactions
  and flags them to a human (caretaker / clinician), who decides.
- It is **not** a chatbot, a "copilot", or a diagnostic tool. It never makes diagnostic claims.

### Core design principle
- **Fuzzy step (AI):** an LLM reads a free-text or photographed prescription and turns it into a
  structured drug/herb list (handles Chinese, pinyin, messy text). **Provider: Google Gemini API.**
- **Safety verdict (deterministic):** whether a combination is dangerous comes from a **lookup
  against a curated, sourced interaction dataset** — never from the model guessing. Every flag is
  explainable: *what, why, severity, source.*

---

## Planned stack

| Layer | Choice |
|---|---|
| App | Next.js (TypeScript), responsive web |
| Cloud DB / auth / storage | Supabase (single region) |
| Fuzzy extraction | Google **Gemini** API (server-side key only) |
| Safety engine | Our own deterministic code, fed by a drop-in interaction dataset |
| Hosting | Vercel + Supabase |

All patient data in the demo is **synthetic**. Hero demo case: an elderly patient on **warfarin
(WM)** also taking a **danshen / dong quai (TCM)** formula → high-severity bleeding-risk flag that
neither practitioner saw.

---

## Status

This is an early commit — **project context only, no application code yet**. Architecture and the
end-to-end "hero flow" are next.

## Documentation
- [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md) — the full implementation brief: complete system
  architecture, hard constraints, the dataset contract, and the end-to-end hero flow.

## Push log
- **Initial commit:** README with project vision, the fuzzy-vs-deterministic design principle, and
  the planned stack (Gemini for extraction).
- **Add project brief:** `docs/PROJECT_BRIEF.md` with the complete system architecture and
  constraints, plus a README link to it.
