# Qiáo — Implementation Brief

> This is the original implementation brief for the project, kept verbatim so any
> teammate (or their LLM) has the complete system architecture and constraints in one place.

---

=== WHAT THIS IS ===
We are building "Qiáo" (≈ "Bridge") in a 24-hour healthcare hackathon (EuroTeQ × Hong Kong
Talent Engage). Your job is the IMPLEMENTATION side: help design and build the working software
and the GitHub repo. This brief gives you the product vision and hard constraints; the specific
stack/architecture is open for you to propose and justify, but it is now a CLOUD-BASED system
(see constraints).

=== THE PROBLEM ===
Setting: elderly care in Hong Kong, where the population is aging and two systems of care run in
parallel without talking to each other:
- Western Medicine (WM) and Traditional Chinese Medicine (TCM) are used by the same patients but
  their records, prescriptions, and practitioners are siloed.
- Different departments/providers don't converge → fragmented care, and nobody sees the full
  picture. Elderly patients on multiple WM drugs PLUS herbal TCM formulas are at real risk of
  dangerous interactions that neither side catches.
Abbreviations: WM = Western Medicine; TCM = Traditional Chinese Medicine.

=== THE PRODUCT (vision) ===
Qiáo is a cloud-based bridge that converges a patient's WM and TCM information into one view,
flags medication conflicts the siloed systems miss, and lets the right people access that record
remotely. Three user types:

ELDERLY USER
- A unified TCM/WM "passport" (exportable as PDF) — their consolidated record.
- Flags medication conflicts across WM+TCM.
- Easy data entry (low-friction intake; assume elderly users — minimize manual typing; e.g.,
  photograph or paste a prescription, or pick from a list rather than free-typing).
- (Roadmap, not core build: preventative screening suggestions.)

CARETAKER (a primary buyer — institutional/family use)
- Input, manage, and monitor a patient's medications/records.
- A unified medication dashboard.
- REMOTE ACCESS: a registered caretaker linked to a patient can view that patient's records from
  anywhere (their own logged-in account), not only on a shared device.
- Transparency and "peace of mind" — see everything in one place.

TCM PRACTITIONER
- Informed at the point of prescribing, to avoid conflicting/inappropriate prescriptions.
- Risk mitigation; integration with modern (Western) care.

SHARING WITH MEDICAL INSTITUTIONS
- Because records live in the cloud, the system can securely export/share a patient's unified
  passport with a medical institution (e.g., a secure PDF and/or a shareable, access-controlled
  record link). Treat this as a supporting feature, not the hero flow.

=== HARD CONSTRAINTS (these shape architecture) ===
1. NOT A CHATBOT/"COPILOT." The hackathon organizers explicitly said do NOT build a "copilot
   healthcare app." Qiáo is a reconciliation + conflict-detection SYSTEM, not a Q&A assistant.
2. CLOUD-BASED WITH ACCESS CONTROL. Data is stored in the cloud (a hosted database/backend), NOT
   local-first. This is a deliberate change. Requirements that follow from it:
   - User accounts and ROLE-BASED ACCESS CONTROL: elderly user, caretaker, TCM practitioner.
   - A caretaker can only see patients they are explicitly linked to.
   - Sensitive data in transit and at rest should be handled responsibly (use HTTPS; don't log
     secrets). For a 24h build, keep auth MINIMAL/DEMO-GRADE (e.g., simple email+password or even
     seeded demo accounts) — do NOT burn hours on production-grade identity.
   - Jurisdiction note: prefer a single region for all data (e.g., a Hong Kong region) and avoid
     replicating across the Hong Kong–mainland border, which raises legal issues (Hong Kong's
     Personal Data (Privacy) Ordinance vs mainland China's Personal Information Protection Law).
     We use synthetic data for the demo, which sidesteps this — state that assumption in the README.
3. LIABILITY / CLINICAL SAFETY: the system must NOT make diagnostic claims and must use only
   VERIFIED datasets. It surfaces known, sourced interactions and flags them to a human — the
   clinician/caretaker decides. This is a safety tool, not a decision-maker.
4. EXPLAINABILITY: every conflict flag must be explainable and sourced (what, why, severity,
   source) — no black-box outputs.
5. This is a 24-hour build with required deliverables (see below). Favor ONE excellent, working,
   demoable flow over broad-but-shallow features. Synthetic/mock patient data is expected and fine.

=== KEY ARCHITECTURE PRINCIPLE TO HONOR ===
Where AI/LLM is used, prefer this split: the LLM handles the FUZZY parts (e.g., extracting a
structured herb/drug list from a free-text or photographed TCM prescription, normalizing names),
but the SAFETY VERDICT (is there a conflict? how severe?) comes from a DETERMINISTIC lookup
against a curated, sourced interaction dataset — never from the model guessing. This is what keeps
the product explainable, defensible, and clearly "not a copilot."
Because the system is now cloud-based, you MAY call a hosted LLM API (e.g., the Gemini API) for
the fuzzy extraction/normalization step instead of running a local model — keep the API key
server-side, never in the client. The fuzzy-vs-deterministic split above is fixed regardless of
where the model runs.

=== CRITICAL DEPENDENCY (do not duplicate) ===
A SEPARATE agent is producing the interaction dataset — your engine consumes it, you do NOT create
the clinical data. It will deliver two normalized JSON files in this shape (build to this contract):

entities.json — every drug/herb/formula, normalized once with a stable id:
  { "entity_id","preferred_name","type"("WM-drug"|"TCM-herb"|"TCM-formula"),
    "drug_class","rxnorm_id","latin","pinyin","chinese","common_names":[],"active_constituents":[] }

interactions.json — interaction rows referencing entity ids:
  { "id","agent_a_id","agent_b_id",
    "interaction_class"("TCM-WM"|"WM-WM"|"TCM-TCM"),
    "severity"("contraindicated"|"major"|"moderate"|"minor"),
    "effect_direction","mechanism","clinical_effect","management",
    "evidence_level"("established"|"probable"|"possible"|"theoretical"),
    "sources":[{"type","ref","note"}] }

Until that lands, work against a small mock file in the SAME schema so you're never blocked. When
the real dataset arrives, it should be a drop-in replacement. Hero demo pair to design around:
an elderly patient on warfarin (WM) who is also taking a TCM formula containing danshen/dong quai
→ the system flags a high-severity bleeding-risk interaction that neither practitioner saw.

=== THE HERO FLOW TO MAKE WORK END-TO-END ===
1. Intake: a patient with a WM record (conditions + meds) and a TCM record (for now the only way to enter data is upload a pdf and use OCR or a simple text entry). Make entry easy.
2. Extract & normalize: parse both into one shared medication schema (LLM does the TCM free-text →
   structured herbs step; map to entity ids).
3. Converge & check: merge into a unified view; persist it to the cloud; run conflict checks via
   deterministic lookup against interactions.json.
4. Explainable alert: show sourced, severity-rated conflict alerts (for clinicians/caretakers,
   not patient self-diagnosis).
5. Outputs/views: the unified passport (PDF export) + a caretaker medication dashboard, viewable
   remotely via a logged-in account. Consider a single dataset with a role view-toggle
   (elderly / caretaker / TCM) rather than three separate UIs, to save build time and to visually
   demonstrate "the silos converging." Include the secure share/export-to-institution action.
6. (Strongly recommended, plays to our strengths) an append-only, tamper-evident AUDIT LOG of
   every intake, every alert, and every record access/share — reinforces the safety/integrity
   story and is especially relevant now that records are accessed remotely.

=== DELIVERABLES (hackathon submission, ~24h) ===
- A working GitHub repo (clean README: problem, architecture, how-to-run, data-handling note
  [cloud storage, access control, synthetic data, single-jurisdiction assumption], and an honest
  "prototype vs. roadmap / limitations" section).
- The build must support a 2-minute TECHNICAL video (show the real pipeline: intake → extract →
  normalize → deterministic conflict check → explainable alert → remote caretaker view → audit log).
- (A separate 2-minute pitch video exists; not your concern, but build something that demos well.)

=== OPEN QUESTIONS (resolved) ===
- Target platform: responsive WEB app.
- Language/localization: bilingual where it matters — full Chinese support in intake/extraction,
  bilingual (English + Traditional Chinese) passport + alert screens, English admin screens.
- Stack/hosting: Next.js (TypeScript) + Supabase (single region) + Vercel; Gemini API for the
  fuzzy extraction step (server-side key).

=== HOW TO ENGAGE ===
Propose a concrete, fast-to-build CLOUD stack and architecture that satisfies the constraints
(cloud-based with role-based access, explainable, not-a-chatbot, drop-in dataset contract), then
implement the hero flow end-to-end before adding breadth. Call out risks and scope-cuts
proactively — under a 24h clock, protecting time for the repo README and the technical video
matters as much as the code. Use synthetic patient data.
