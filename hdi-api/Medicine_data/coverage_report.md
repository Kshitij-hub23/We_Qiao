# Coverage Report — Qiáo Interaction Dataset

**Stage:** Proof-of-concept (~50 rows), hand-curated across all three classes.
**Validated against:** `entities.json` (46 entities) + `interactions.json` (51 rows). Result: **PASS**.

---

## 1. Counts per interaction class

| Class | Rows | POC target | Status |
|---|---|---|---|
| **TCM-WM** | 30 | ~30 | ✅ met |
| **WM-WM** | 12 | ~12 | ✅ met |
| **TCM-TCM** | 9 | ~8 | ✅ met (genuinely sparse — see §5) |
| **Total** | **51** | ~50 | ✅ |

Entities: **46** (22 TCM herbs, 24 WM drugs). Unique sources: **129**.

### Severity distribution (all 51)
`contraindicated` 11 · `major` 19 · `moderate` 18 · `minor` 3

### Evidence-level distribution (all 51)
`established` 19 · `probable` 13 · `possible` 18 · `theoretical` 1

### Effect-direction distribution (all 51)
`potentiation` 25 · `inhibition` 18 · `additive` 8

### Per class
| Class | n | Evidence breakdown | Severity breakdown |
|---|---|---|---|
| TCM-WM | 30 | established 7 · probable 13 · possible 10 | contraindicated 2 · major 10 · moderate 15 · minor 3 |
| WM-WM | 12 | established 12 | contraindicated 2 · major 8 · moderate 2 |
| TCM-TCM | 9 | possible 8 · theoretical 1 | contraindicated 7 · major 1 · moderate 1 |

---

## 2. Hero-pair coverage (the original demo backbone — all retained, unchanged)

All seven hero herbs covered; both demo centerpieces present and cited:
**danshen↔warfarin (INT-0001, major/probable)** and **dong quai↔warfarin (INT-0003, major/possible)**.

| Herb | Drug class(es) covered | IDs |
|---|---|---|
| Danshen | anticoagulant, antiplatelet | INT-0001, INT-0002 |
| Dong quai | anticoagulant | INT-0003 |
| Ginkgo | anticoagulant, antiplatelet, **PPI (CYP2C19)** | INT-0004, INT-0005, INT-0018 |
| Ginseng (American / Asian) | anticoagulant ×2, antidiabetic | INT-0006, INT-0007, INT-0029 |
| Garlic | anticoagulant, antiretroviral (CYP3A4/P-gp) | INT-0008, INT-0009 |
| Licorice | antihypertensive, diuretic, **digoxin**, **corticosteroid** | INT-0010, INT-0011, INT-0024, INT-0025 |
| St John's Wort | immunosuppressant ×2, anticoagulant, statin, OC, digoxin, **SSRI**, **HIV PI**, **PPI** | INT-0012–0017, INT-0026, INT-0027, INT-0028 |

---

## 3. Expansion additions (rows INT-0018 – INT-0051)

### New TCM-WM (13): INT-0018 – INT-0030
ginkgo↔omeprazole · schisandra↔tacrolimus (potentiation — CYP3A4 inhibition raises levels) ·
coptis/berberine↔cyclosporine · green tea↔warfarin (vitamin-K antagonism) · ginger↔warfarin ·
turmeric↔warfarin · licorice↔digoxin (hypokalemia) · licorice↔prednisolone · SJW↔sertraline
(serotonin-syndrome) · SJW↔indinavir (contraindicated) · SJW↔omeprazole · Asian-ginseng↔warfarin
(conflicting) · berberine↔metformin (additive glucose-lowering). New herbs added: schisandra,
coptis, green tea, ginger, turmeric.

### New WM-WM (12): INT-0031 – INT-0042 — all `established`
warfarin↔aspirin · warfarin↔ibuprofen · warfarin↔amiodarone · warfarin↔fluconazole ·
warfarin↔clarithromycin · simvastatin↔clarithromycin (contraindicated) · simvastatin↔gemfibrozil
(contraindicated) · simvastatin↔amlodipine · lisinopril↔spironolactone (hyperkalemia) ·
lisinopril↔ibuprofen ("triple whammy") · digoxin↔amiodarone · clopidogrel↔omeprazole.
Sourced primarily to **FDA DailyMed labels + DDInter + primary PMIDs**.

### New TCM-TCM (9): INT-0043 – INT-0051 — classical incompatibilities
**十八反 (Eighteen Incompatibles):** licorice↔sargassum, licorice↔kansui, licorice↔genkwa,
aconite↔pinellia, aconite↔fritillaria, aconite↔trichosanthes, veratrum↔ginseng, veratrum↔danshen.
**十九畏 (Nineteen Antagonisms):** ginseng↔wulingzhi. Each cited to peer-reviewed experimental
toxicology / network-pharmacology studies; graded `possible` (real rodent/in-vitro data) or
`theoretical` (traditional/mechanism only).

---

## 4. Lowest-confidence rows & audit notes (read critically)

**`theoretical` (1):**
- **INT-0048 aconite↔trichosanthes** — classical 十八反 pair supported only by one Aconitum
  toxicology review (single source); no pair-specific experimental data fetched. Lowest-confidence
  row in the set.

**Single-source rows (3):** INT-0036 (simvastatin↔clarithromycin — FDA simvastatin label, which
explicitly contraindicates the pair), INT-0048 (above), INT-0050 (veratrum↔danshen — one specific
in-vivo/in-vitro study). All ≥1 verified source per the rules.

**`possible` / conflicting TCM-WM** (genuine evidence conflict, graded down honestly): INT-0002
danshen↔aspirin, INT-0003 dong quai↔warfarin (weakest centerpiece — single case report + opposite-
direction animal study), INT-0004 ginkgo↔warfarin, INT-0005 ginkgo↔antiplatelet, INT-0008
garlic↔warfarin, INT-0022 ginger↔warfarin (controlled study negative), INT-0029 Asian-ginseng↔warfarin
(two negative controlled studies vs one positive case report).

**Audit corrections applied during expansion (the verification pipeline working):**
- **Retracted source removed:** PMID 27247609 (licorice↔kansui) was found to be **retracted (Feb 2026)**
  for image manipulation; dropped. Row stands on PMID 27084456 + 29198875.
- **Wrong-pair DDInter links removed:** the proposed DDInter pages for warfarin↔aspirin (was a
  Warfarin–Miconazole page) and warfarin↔amiodarone (was a Disopyramide–Amiodarone page) did not
  match the cited pair and were dropped; those rows stand on FDA label / primary cohort evidence.
- **Direction error fixed:** veratrum↔ginseng (INT-0049) corrected from `potentiation` to
  `inhibition` — all three cited studies show Veratrum *reducing* ginseng's activity.
- **Hero-row citation fix (carried forward):** SJW↔cyclosporine (INT-0012) uses the verified
  PMID 12392581, replacing a mis-typed PMID that resolved to an unrelated dermatology paper.
- **rxnav lookup URLs** used only for ID verification were stripped from interaction `sources`
  (they are normalization aids, not interaction evidence); see the RxNorm note in `SOURCES.md`.

**Class-representative entities** (stated in-row): amlodipine ← antihypertensives (INT-0010);
glipizide / metformin ← antidiabetics (INT-0007, INT-0030); hydrochlorothiazide ← thiazide/loop
diuretics (INT-0011). Production should expand these to full drug classes.

**Provenance caveat — warfarin↔amiodarone (INT-0033):** after removing the mis-matched DDInter link,
this row's citations are one large propensity-matched cohort (PMID 32112562) plus its open-access
mirror (PMC7217725). It is graded `established` on **strong clinical consensus** (a textbook DDI),
but the citation set is effectively a single primary study — flagged here for transparency.

---

## 5. Known gaps (honest)

- **TCM-TCM remains intrinsically sparse.** These 9 rows are classical contraindications
  (十八反/十九畏) backed mostly by rodent/in-vitro toxicology and network-pharmacology, not human
  clinical interaction reports — hence `possible`/`theoretical`, never `established`. There is **no
  large body of PubMed-citable human herb↔herb interaction data**; we included only sourced pairs and
  did not pad the class. The classical lists contain more pairs (e.g., further aconite and licorice
  incompatibilities) that could be added if a real citation is found for each.
- **WM-WM is a representative dozen, not exhaustive.** Many more elderly-care DDIs exist
  (e.g., SSRIs↔NSAIDs, methotrexate↔trimethoprim, verapamil↔digoxin, ACEi↔potassium). The 12 here
  are all `established` and centre on the highest-frequency, highest-harm pairs.
- **More TCM-WM herbs** remain (ginger and turmeric now added; feverfew, kava, green-tea↔other drugs,
  ephedra/ma huang, goldenseal, etc. could follow).
- **No TCM formulas yet** — when added, each should link to component herb entities.
- For production: integrate a validated commercial source (DrugBank/Lexicomp) and add clinical review,
  per the README disclaimer.

---

## 6. Validation summary
`python3 validate_qiao.py`: JSON parses; all `agent_*` references resolve to entities; only
controlled-vocabulary values used; every one of the 51 rows has ≥1 source with a non-empty `ref`;
no self-interactions; no duplicate entity pairs. 129 unique sources. **PASS.**
