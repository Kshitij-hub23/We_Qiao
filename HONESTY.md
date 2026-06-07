# HONESTY.md

> **Qiáo (橋, "bridge")** — a reconciliation + conflict-detection system that converges a patient's
> Western Medicine (WM) and Traditional Chinese Medicine (TCM) records into one view and flags dangerous
> drug–herb interactions the two siloed systems miss. EuroTeQ × HKTE Healthcare Hackathon (HealthTech, elderly care).
> Architecture detail: [`CLAUDE.md`](./CLAUDE.md) and [`docs/`](./docs/).

---

## 1. Team — who did what
Verified against `git shortlog -sne --all`.

| Member | GitHub handle | Main contributions |
|---|---|---|
| Kshitij | Kshitij-hub23 | Next.js frontend & Liquid-Glass design system, patient/caregiver/doctor portals, intake→confirm→results flow, EN/繁體中文 i18n, PDF export, OCR review dialog UI, engine-proxy API routes, dev tooling (`dev:all`/`.venv`), landing page, docs |
| Alex Fedyaev | fedalexiss | Deterministic conflict engine (`hdi-api/`), LLM medicine-name standardizer & extraction pipeline (`standardizer/`), Gemini OCR, fuzzy/vector name matching, role-based conflict detail, build-artifact gitignore cleanup |

---

## 2. What is fully working
Real, end-to-end with real logic:

- **Deterministic conflict engine** (`hdi-api/`, FastAPI + SQLite) — takes a list of drug/herb names, resolves them to entities (exact alias + `rapidfuzz` fuzzy fallback), and returns sourced interaction alerts with severity, mechanism, clinical effect, and source. The safety verdict is a **deterministic dataset lookup, never model-generated.**
- **Curated interaction dataset** — ~756 entities, **51 sourced interactions** (`hdi-api/Medicine_data/`), each clinical claim sourced (see `Medicine_data/SOURCES.md`).
- **Gemini-powered intake** (`standardizer/`, port 8001) — real `gemini-2.5-flash` calls: image OCR of a prescription + free-text name extraction. Extraction returns candidate name strings only; matching is the engine's job.
- **Chinese name resolution** — OpenCC simplified⇄traditional + pinyin variant expansion (`hdi-api/resolver.py`), so one stored Chinese form matches both scripts. Bilingual **EN / 繁體中文** UI.
- **Next.js frontend** (port 3000) — intake → extract → resolve → deterministic check → severity-rated alerts. Server-side API routes proxy both Python services so **the browser never holds a key.**
- **Portals** — patient dashboard/profile (system Patient ID), caregiver permission-scoped read-only view, doctor/practitioner patient roster + editable records. Bilingual sign-in flow.
- **OCR review dialog** — user confirms/edits extracted text before it enters intake.

---

## 3. What is mocked, stubbed, or hardcoded

| What is faked | Where | Why | What the real version would do |
|---|---|---|---|
| Auth & user accounts | `lib/auth.ts`, seeded accounts | Demo-grade, no time for prod identity | Real Supabase auth + RBAC |
| Data storage / persistence | client-side `localStorage` | No backend DB wired yet | Supabase cloud DB (single region near HK) |
| Patient records | synthetic / seeded data only | Prototype, no real PHI | Real reconciled patient records |
| Root path `/` auth gate | `app/page.tsx` forces login + clears session | Clean demo every load | Persist session, redirect to role landing |

---

## 4. External APIs, services & data sources

| Service / API / dataset | Used for | Real or mocked? | Auth |
|---|---|---|---|
| Google Gemini API (`gemini-2.5-flash`) | Prescription OCR + name extraction | **Real**, server-side only | `GEMINI_API_KEY` in `.env` (gitignored) |
| Interaction dataset (756 entities, 51 interactions) | Deterministic conflict lookup | **Real**, curated + sourced | Local SQLite (seeded) |
| Supabase / Vercel | Planned cloud DB + hosting | **Not yet wired** (runs as 3 local services) | n/a |
| Cloudflare quick tunnel | Public demo access (`share.bat`) | Real, per-session URL | None |

---

## 5. Pre-existing code

| Item | Source | Roughly how much | License |
|---|---|---|---|
| Next.js, React, Tailwind, FastAPI, rapidfuzz, OpenCC, google-genai, lucide-react | npm / PyPI (open-source) | Dependencies only | Respective OSS |

All Qiáo application code (`app/`, `components/`, `lib/`, `hdi-api/`, `standardizer/`) and the interaction dataset were built during the hackathon window.

---

## 4a. Data provenance — clinical data is 100% sourced

The clinical data behind every conflict flag is **fully sourced from authentic, authoritative references** —
not model-generated and not invented:

- **All 51 interactions** (mechanism, severity, clinical effect) cite **129 unique sources** —
  PubMed (PMID), DOI papers, and regulatory/database records (FDA DailyMed labels, NCBI Bookshelf,
  PMC, NCCIH, MSK About Herbs, DDInter). Full list: [`hdi-api/Medicine_data/SOURCES.md`](./hdi-api/Medicine_data/SOURCES.md).
- **Independently audited:** each source was fetched and read during curation, then **re-fetched by a
  second adversarial auditor** to confirm it resolves to the stated paper and supports the claim. A
  retracted paper, two wrong-pair links, and a direction error were caught and corrected.
- **Drug identities verified** against **RxNorm/RxNav (NIH NLM)** — every `rxnorm_id` in `entities.json` confirmed.
- *Scope note:* herb/drug **name aliases** (Chinese/pinyin/Latin variants) are vocabulary for matching,
  not clinical claims, so they are not individually cited — but every **interaction verdict** is.

---

## 5a. Clinical domain validation

We consulted a practicing TCM practitioner, **Dr. Zhou** (Brussels, Belgium), on **6 June 2026** to
validate the project's premise. He confirmed that TCM ↔ Western-medicine combinations carry real,
assessable interaction risk (e.g. danshen/angelica/safflower + anticoagulants → bleeding) and described
the four-dimension clinical assessment framework. The **full verbatim consultation** is recorded in
[`ADVISOR_CONSULTATION.md`](./ADVISOR_CONSULTATION.md).

---

## 6. Known limitations & next steps

- **Demo-grade auth + `localStorage` persistence** — no real backend DB; Supabase migration is the top priority.
- **Synthetic patient data only** — no real PHI; not a diagnostic tool, surfaces known interactions for a human to decide.
- **Not built yet:** PDF medication-passport export, tamper-evident audit log.
- **Runs as 3 local processes** (engine 8000, intake 8001, web 3000) rather than the envisioned single cloud app; production deploy to Vercel + hosted engine is pending.
- Next: wire Supabase, build the passport export + audit log, deploy to a stable URL.
</content>
