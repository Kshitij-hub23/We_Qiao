# SOURCES - Qiao Interaction Dataset

Every interaction row in `interactions.json` cites one or more of the sources below.
Each source was **fetched and read live** during curation, then **independently re-fetched by a
second (adversarial) auditor agent** that re-opened each PMID/DOI/DB record to confirm it resolves
to the stated paper and supports the claim. The title shown is the exact title seen on the page.
Sources tagged *(negative/conflicting)* were retained deliberately to keep the evidence honest -
they weaken or contradict the interaction and are reflected in the `evidence_level` grading.

**129 unique sources** across 51 interaction rows. Reference formats: `PMID` = PubMed ID
(`https://pubmed.ncbi.nlm.nih.gov/<id>/`); `DOI` = `https://doi.org/<doi>`; `DB` = named database /
full-text record / regulatory label (PMC ID, NCBI Bookshelf, DailyMed, DDInter, NCCIH, MSK About Herbs, etc.).

Audit corrections applied during expansion: a **retracted** paper (PMID 27247609) was dropped; two
**wrong-pair DDInter links** were removed; one **direction error** (veratrum-ginseng) was fixed; the
hero-row cyclosporine citation was corrected from a mis-typed PMID to the verified PMID 12392581.

---

1. **[PMID 7494191]** The effects of Danshen (Salvia miltiorrhiza) on warfarin pharmacodynamics and pharmacokinetics of warfarin enantiomers in rats  -- *Used by: INT-0001.*
2. **[PMID 7487701]** Warfarin interactions with Chinese traditional medicines: danshen and methyl salicylate medicated oil  -- *Used by: INT-0001.*
3. **[PMID 10215271]** Warfarin danshen interaction  -- *Used by: INT-0001.*
4. **[DOI 10.1345/aph.19029]** Interaction between Warfarin and Danshen (Salvia Miltiorrhiza)  -- *Used by: INT-0001.*
5. **[DB PMC4325561]** Interaction between warfarin and Chinese herbal medicines  -- *Used by: INT-0001, INT-0003, INT-0006.*
6. **[PMID 23671711]** A review of potential harmful interactions between anticoagulant/antiplatelet agents and Chinese herbal medicines  -- *Used by: INT-0002.*
7. **[PMID 29849736]** Discovery of a Novel ERp57 Inhibitor as Antiplatelet Agent from Danshen (Salvia miltiorrhiza)  -- *Used by: INT-0002.*
8. **[PMID 28831288]** Uncertain Associations of Major Bleeding and Concurrent Use of Antiplatelet Agents and Chinese Medications: A Nested Case-Crossover Study  *(negative/conflicting)*  -- *Used by: INT-0002.*
9. **[PMID 10417036]** Potentiation of warfarin by dong quai  -- *Used by: INT-0003.*
10. **[PMID 7588995]** Danggui (Angelica sinensis) affects the pharmacodynamics but not the pharmacokinetics of warfarin in rabbits  *(negative/conflicting)*  -- *Used by: INT-0003.*
11. **[DB PMC4765589]** Ginkgo and Warfarin Interaction in a Large Veterans Administration Population  -- *Used by: INT-0004.*
12. **[PMID 15801937]** Effect of ginkgo and ginger on the pharmacokinetics and pharmacodynamics of warfarin in healthy subjects  *(negative/conflicting)*  -- *Used by: INT-0004, INT-0022.*
13. **[PMID 12772396]** [Effect of Coenzyme Q10 and Ginkgo biloba on warfarin dosage in patients on long-term warfarin treatment. A randomized, double-blind, placebo-controlled cross-over trial]  *(negative/conflicting)*  -- *Used by: INT-0004.*
14. **[PMID 28797065]** A systematic review of the pharmacokinetic and pharmacodynamic interactions of herbal medicine with warfarin  *(negative/conflicting)*  -- *Used by: INT-0004, INT-0008.*
15. **[DB NBK71683]** Spontaneous bleeding associated with Ginkgo biloba: a case report and systematic review of the literature (NCBI Bookshelf)  -- *Used by: INT-0005.*
16. **[DOI 10.1371/journal.pone.0321804]** Impact of Ginkgo biloba drug interactions on bleeding risk and coagulation profiles: A comprehensive analysis  -- *Used by: INT-0005.*
17. **[PMID 17010102]** Pharmacodynamic interaction studies of Ginkgo biloba with cilostazol and clopidogrel in healthy human subjects  *(negative/conflicting)*  -- *Used by: INT-0005.*
18. **[PMID 18214851]** Potential interaction of Ginkgo biloba leaf with antiplatelet or anticoagulant drugs: what is the evidence?  *(negative/conflicting)*  -- *Used by: INT-0005.*
19. **[PMID 21649517]** Risk of hemorrhage associated with co-prescriptions for Ginkgo biloba and antiplatelet or anticoagulant drugs  *(negative/conflicting)*  -- *Used by: INT-0005.*
20. **[PMID 15238367]** Brief communication: American ginseng reduces warfarin's effect in healthy patients: a randomized, controlled Trial  -- *Used by: INT-0006.*
21. **[DB https://www.mskcc.org/cancer-care/integrative-medicine/herbs/ginseng-american]** Ginseng (American) | Memorial Sloan Kettering Cancer Center  -- *Used by: INT-0006.*
22. **[PMID 25265315]** The effect of ginseng (the genus panax) on glycemic control: a systematic review and meta-analysis of randomized controlled clinical trials  -- *Used by: INT-0007.*
23. **[PMID 16860976]** Korean red ginseng (Panax ginseng) improves glucose and insulin regulation in well-controlled, type 2 diabetes: results of a randomized, double-blind, placebo-controlled study of efficacy and safety  -- *Used by: INT-0007.*
24. **[DB https://www.mskcc.org/cancer-care/integrative-medicine/herbs/ginseng-asian]** Ginseng (Asian) | Memorial Sloan Kettering Cancer Center  -- *Used by: INT-0007.*
25. **[DOI 10.1186/s13098-017-0254-9]** Interactions between antidiabetic drugs and herbs: an overview of mechanisms of action and clinical implications  -- *Used by: INT-0007.*
26. **[DB https://www.mskcc.org/cancer-care/integrative-medicine/herbs/garlic]** Garlic | Memorial Sloan Kettering Cancer Center  -- *Used by: INT-0008.*
27. **[PMID 18516070]** Pharmacodynamic interaction of warfarin with cranberry but not with garlic in healthy subjects  *(negative/conflicting)*  -- *Used by: INT-0008.*
28. **[PMID 11740713]** The effect of garlic supplements on the pharmacokinetics of saquinavir  -- *Used by: INT-0009.*
29. **[PMID 20933082]** Garlic extract induces intestinal P-glycoprotein, but exhibits no effect on intestinal and hepatic CYP3A4 in humans  -- *Used by: INT-0009.*
30. **[PMID 21104925]** HIV protease inhibitors: garlic supplements and first-pass intestinal metabolism impact on the therapeutic efficacy  -- *Used by: INT-0009.*
31. **[PMID 39753286]** Liquorice-induced pseudohyperaldosteronism: a rare cause for severe hypertension  -- *Used by: INT-0010.*
32. **[DOI 10.3389/fnut.2021.719197]** Clinical Risk Factors of Licorice-Induced Pseudoaldosteronism Based on Glycyrrhizin-Metabolite Concentrations: A Narrative Review  -- *Used by: INT-0010, INT-0011.*
33. **[DOI 10.3389/fendo.2019.00484]** Licorice: From Pseudohyperaldosteronism to Therapeutic Uses  -- *Used by: INT-0010.*
34. **[PMID 39807221]** Licorice-Induced Pseudohyperaldosteronism: A Case Report  -- *Used by: INT-0011.*
35. **[PMID 10683008]** Acute heart transplant rejection due to Saint John's wort  -- *Used by: INT-0012.*
36. **[PMID 12580993]** Alterations in cyclosporin A pharmacokinetics and metabolism during treatment with St John's wort in renal transplant patients  -- *Used by: INT-0012.*
37. **[PMID 12392581]** St John's wort (Hypericum perforatum): drug interactions and clinical outcomes  -- *Used by: INT-0012, INT-0016.*
38. **[PMID 15089812]** Effect of St John's wort and ginseng on the pharmacokinetics and pharmacodynamics of warfarin in healthy subjects  -- *Used by: INT-0013, INT-0029.*
39. **[PMID 27340114]** Warfarin, St John's wort and INR  -- *Used by: INT-0013.*
40. **[DB https://www.mskcc.org/cancer-care/integrative-medicine/herbs/st-john-wort]** St. John's Wort | Memorial Sloan Kettering Cancer Center (About Herbs)  -- *Used by: INT-0013, INT-0026, INT-0027, INT-0028.*
41. **[PMID 11753267]** Different effects of St John's wort on the pharmacokinetics of simvastatin and pravastatin  -- *Used by: INT-0014.*
42. **[PMID 17846933]** Effects of treatment with a commercially available St John's Wort product (Movina) on cholesterol levels in patients with hypercholesterolemia treated with simvastatin  -- *Used by: INT-0014.*
43. **[DB PMC7056460]** Clinical relevance of St. John's wort drug interactions revisited  -- *Used by: INT-0014.*
44. **[PMID 14663455]** The interaction between St John's wort and an oral contraceptive  -- *Used by: INT-0015.*
45. **[PMID 15914127]** Interaction of St. John's Wort with oral contraceptives: effects on the pharmacokinetics of norethindrone and ethinyl estradiol, ovarian activity and breakthrough bleeding  -- *Used by: INT-0015.*
46. **[PMID 14616430]** Interaction of St John's wort with low-dose oral contraceptive therapy: a randomized controlled trial  -- *Used by: INT-0015.*
47. **[PMID 10546917]** Pharmacokinetic interaction of digoxin with an herbal extract from St John's wort (Hypericum perforatum)  -- *Used by: INT-0016.*
48. **[PMID 11180019]** St John's Wort induces intestinal P-glycoprotein/MDR1 and intestinal and hepatic CYP3A4  -- *Used by: INT-0016.*
49. **[PMID 12637655]** Impact of St John's wort treatment on the pharmacokinetics of tacrolimus and mycophenolic acid in renal transplant patients  -- *Used by: INT-0017.*
50. **[PMID 14681346]** Effects of St. John's wort (Hypericum perforatum) on tacrolimus pharmacokinetics in healthy volunteers  -- *Used by: INT-0017.*
51. **[PMID 15608563]** Pharmacogenetics and herb-drug interactions: experience with Ginkgo biloba and omeprazole  -- *Used by: INT-0018.*
52. **[PMID 23865865]** Pharmacokinetic drug interactions involving Ginkgo biloba  -- *Used by: INT-0018.*
53. **[PMID 17506780]** Effects of Schisandra sphenanthera extract on the pharmacokinetics of tacrolimus in healthy volunteers  -- *Used by: INT-0019.*
54. **[PMID 21656210]** Effects of Schisandra sphenanthera extract on the blood concentration of tacrolimus in renal transplant recipients  -- *Used by: INT-0019.*
55. **[PMID 32768638]** Co-administration of Wuzhi tablet (Schisandra sphenanthera extract) alters tacrolimus pharmacokinetics in a dose- and time-dependent manner in rats  -- *Used by: INT-0019.*
56. **[DB https://www.mskcc.org/cancer-care/integrative-medicine/herbs/schisandra]** Schisandra | Memorial Sloan Kettering Cancer Center (About Herbs)  -- *Used by: INT-0019.*
57. **[PMID 16133554]** Effects of berberine on the blood concentration of cyclosporin A in renal transplanted recipients: clinical and pharmacokinetic study  -- *Used by: INT-0020.*
58. **[PMID 16541194]** The effects of berberine on the pharmacokinetics of cyclosporin A in healthy volunteers  -- *Used by: INT-0020.*
59. **[DB https://pmc.ncbi.nlm.nih.gov/articles/PMC3913293/]** Cyclosporine and Herbal Supplement Interactions  -- *Used by: INT-0020.*
60. **[PMID 10332534]** Probable antagonism of warfarin by green tea  -- *Used by: INT-0021.*
61. **[DOI 10.1345/aph.18238]** Probable Antagonism of Warfarin by Green Tea  -- *Used by: INT-0021.*
62. **[DB https://www.mskcc.org/cancer-care/integrative-medicine/herbs/green-tea]** Green Tea | Memorial Sloan Kettering Cancer Center (About Herbs)  -- *Used by: INT-0021.*
63. **[DB https://www.mskcc.org/cancer-care/integrative-medicine/herbs/ginger]** Ginger | Memorial Sloan Kettering Cancer Center  -- *Used by: INT-0022.*
64. **[PMID 17723077]** Risk of warfarin-related bleeding events and supratherapeutic international normalized ratios associated with complementary and alternative medicine: a longitudinal analysis  -- *Used by: INT-0022.*
65. **[DOI 10.1371/journal.pone.0182794]** A systematic review of the pharmacokinetic and pharmacodynamic interactions of herbal medicine with warfarin  -- *Used by: INT-0022.*
66. **[DB https://medsafe.govt.nz/safety/ews/2018/Turmeric.asp]** Beware turmeric/curcumin containing products can interact with warfarin  -- *Used by: INT-0023.*
67. **[DB https://www.mskcc.org/cancer-care/integrative-medicine/herbs/turmeric]** Turmeric | Memorial Sloan Kettering Cancer Center  -- *Used by: INT-0023.*
68. **[PMID 41300526]** Curcumin in the Treatment of Kidney Disease: A Systematic Review with a Focus on Drug Interactions  -- *Used by: INT-0023.*
69. **[PMID 36825153]** Interaction between Chinese medicine and digoxin: Clinical and research update  -- *Used by: INT-0024.*
70. **[DB https://www.mskcc.org/cancer-care/integrative-medicine/herbs/licorice]** Licorice | Memorial Sloan Kettering Cancer Center  -- *Used by: INT-0024.*
71. **[PMID 34604277]** Clinical Risk Factors of Licorice-Induced Pseudoaldosteronism Based on Glycyrrhizin-Metabolite Concentrations: A Narrative Review  -- *Used by: INT-0024.*
72. **[DB https://www.nccih.nih.gov/health/licorice-root]** Licorice Root: Usefulness and Safety | NCCIH  -- *Used by: INT-0024.*
73. **[PMID 2384181]** The inhibitory effects of glycyrrhizin and glycyrrhetinic acid on the metabolism of cortisol and prednisolone--in vivo and in vitro studies  -- *Used by: INT-0025.*
74. **[PMID 8504732]** Licorice inhibits 11 beta-hydroxysteroid dehydrogenase messenger ribonucleic acid levels and potentiates glucocorticoid hormone action  -- *Used by: INT-0025.*
75. **[DB https://pmc.ncbi.nlm.nih.gov/articles/PMC8484325/]** Clinical Risk Factors of Licorice-Induced Pseudoaldosteronism Based on Glycyrrhizin-Metabolite Concentrations: A Narrative Review  -- *Used by: INT-0025.*
76. **[PMID 10447148]** St. John's wort and antidepressant drug interactions in the elderly  -- *Used by: INT-0026.*
77. **[DB https://www.nccih.nih.gov/health/st-johns-wort]** St. John's Wort: Usefulness and Safety | NCCIH  -- *Used by: INT-0026.*
78. **[PMID 10683007]** Indinavir concentrations and St John's wort.  -- *Used by: INT-0027.*
79. **[DB https://pmc.ncbi.nlm.nih.gov/articles/PMC1874438/]** St John's wort (Hypericum perforatum): drug interactions and clinical outcomes  -- *Used by: INT-0027.*
80. **[DB https://www.nccih.nih.gov/health/providers/digest/herb-drug-interactions]** Herb-Drug Interactions  -- *Used by: INT-0027.*
81. **[PMID 15001970]** St John's wort induces both cytochrome P450 3A4-catalyzed sulfoxidation and 2C19-dependent hydroxylation of omeprazole  -- *Used by: INT-0028.*
82. **[PMID 18637764]** Interaction between warfarin and Panax ginseng in ischemic stroke patients  -- *Used by: INT-0029.*
83. **[PMID 9075501]** Probable interaction between warfarin and ginseng  -- *Used by: INT-0029.*
84. **[PMID 18442638]** Efficacy of berberine in patients with type 2 diabetes mellitus  -- *Used by: INT-0030.*
85. **[PMID 34956436]** The Effect of Berberine on Metabolic Profiles in Type 2 Diabetic Patients: A Systematic Review and Meta-Analysis of Randomized Controlled Trials  -- *Used by: INT-0030.*
86. **[DB https://www.mskcc.org/cancer-care/integrative-medicine/herbs/berberine]** Berberine | Memorial Sloan Kettering Cancer Center  -- *Used by: INT-0030.*
87. **[DB https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=558b7a0d-5490-4c1b-802e-3ab3f1efe760]** WARFARIN SODIUM (WARFARIN) TABLET [AMNEAL PHARMACEUTICALS LLC]  -- *Used by: INT-0031.*
88. **[PMID 33536925]** Identifying and Characterizing Serious Adverse Drug Reactions Associated With Drug-Drug Interactions in a Spontaneous Reporting Database  -- *Used by: INT-0031.*
89. **[DB DailyMed setid 558b7a0d-5490-4c1b-802e-3ab3f1efe760]** WARFARIN SODIUM (WARFARIN) TABLET [AMNEAL PHARMACEUTICALS LLC]  -- *Used by: INT-0032.*
90. **[PMID 2783873]** Interaction of ibuprofen and warfarin on primary haemostasis  -- *Used by: INT-0032.*
91. **[PMID 813951]** Lack of interaction between ibuprofen and warfarin  *(negative/conflicting)*  -- *Used by: INT-0032.*
92. **[PMID 32112562]** The Magnitude of the Warfarin-Amiodarone Drug-Drug Interaction Varies With Renal Function: A Propensity-Matched Cohort Study  -- *Used by: INT-0033.*
93. **[DB PMC7217725]** The magnitude of the warfarin-amiodarone drug-drug interaction varies with renal function: a propensity-matched cohort study  -- *Used by: INT-0033.*
94. **[DB https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=cd24a261-9c15-42b4-8040-89d2dbda174e]** FLUCONAZOLE injection, solution (DailyMed FDA label)  -- *Used by: INT-0034.*
95. **[PMID 8247921]** Possible interaction between warfarin and fluconazole  -- *Used by: INT-0034.*
96. **[PMID 37629518]** Warfarin and Antibiotics: Drug Interactions and Clinical Considerations  -- *Used by: INT-0035.*
97. **[PMID 9545160]** Delayed elevation of international normalized ratio with concurrent clarithromycin and warfarin therapy  -- *Used by: INT-0035.*
98. **[DB https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=903939b3-a01d-4593-85ca-cfe8d4d48d3e]** Clarithromycin for Oral Suspension, USP (DailyMed FDA label)  -- *Used by: INT-0035.*
99. **[DB https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=b6737b25-0c4f-4131-ba23-b0f2252a18ea]** SIMVASTATIN- simvastatin tablet, film coated (DailyMed)  -- *Used by: INT-0036.*
100. **[DB https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=ca760e79-5d8c-4b36-9899-0d37e8e1f24e]** DailyMed - SIMVASTATIN tablet, film coated  -- *Used by: INT-0037.*
101. **[PMID 10976543]** Plasma concentrations of active simvastatin acid are increased by gemfibrozil  -- *Used by: INT-0037.*
102. **[DB https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=5c1c694c-4b08-469e-b538-08e69df06146]** SIMVASTATIN- simvastatin tablet (DailyMed FDA label)  -- *Used by: INT-0038.*
103. **[PMID 16097365]** Interaction between amlodipine and simvastatin in patients with hypercholesterolemia and hypertension  -- *Used by: INT-0038.*
104. **[DB https://ddinter.scbdd.com/ddinter/interact/970473/]** Interaction between Amlodipine and Simvastatin (DDInter ID 970473)  -- *Used by: INT-0038.*
105. **[PMID 11331054]** Life-threatening hyperkalemia during combined therapy with angiotensin-converting enzyme inhibitors and spironolactone: an analysis of 25 cases  -- *Used by: INT-0039.*
106. **[DB https://www.drugs.com/drug-interactions/lisinopril-with-spironolactone-1476-0-2105-0.html?professional=1]** Interactions between Lisinopril and Spironolactone (Drugs.com professional)  -- *Used by: INT-0039.*
107. **[DB https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=8f20acd7-2635-4a9b-b732-2a84ea93dea7]** LISINOPRIL- lisinopril tablet (DailyMed FDA label), Section 7.3 Non-Steroidal Anti-Inflammatory Agents Including Selective Cyclooxygenase-2 Inhibitors  -- *Used by: INT-0040.*
108. **[PMID 36673605]** Hospitalisations Related to the Combination of ACE Inhibitors and/or Angiotensin Receptor Blockers with Diuretics and NSAIDs: A Post Hoc Analysis on the Risks Associated with Triple Whammy  -- *Used by: INT-0040.*
109. **[DB https://ddinter.scbdd.com/ddinter/interact/968789/]** Interaction between Digoxin and Amiodarone — Severity: Major (Distribution)  -- *Used by: INT-0041.*
110. **[PMID 6736437]** Amiodarone-digoxin interaction: clinical significance, time course of development, potential pharmacokinetic mechanisms and therapeutic implications  -- *Used by: INT-0041.*
111. **[DB https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=de8b0b67-eb25-4684-83b5-7ad785314227]** Label: PLAVIX- clopidogrel tablet, film coated (DailyMed)  -- *Used by: INT-0042.*
112. **[DB https://www.medsafe.govt.nz/profs/puarticles/clopidogrelandomeprazole.htm]** Clopidogrel and omeprazole - interaction now confirmed (NZ Medsafe)  -- *Used by: INT-0042.*
113. **[PMID 34561335]** Sub-acute toxicity of licorice-sargassum extract in Sprague-Dawley rats: biochemical, histopathological, and pharmacokinetic studies  -- *Used by: INT-0043.*
114. **[PMID 34567211]** Comparative Efficacy of Haizao Yuhu Decoction Composed of Different Varieties of Glycyrrhiza in Goiter Rats  -- *Used by: INT-0043.*
115. **[PMID 27084456]** The dosage-toxicity-efficacy relationship of kansui and licorice in malignant pleural effusion rats based on factor analysis  -- *Used by: INT-0044.*
116. **[PMID 29198875]** Gancao-Gansui combination impacts gut microbiota diversity and related metabolic functions  -- *Used by: INT-0044.*
117. **[PMID 35004606]** Revealing the Toxicity-Enhancing Essence of Glycyrrhiza on Genkwa Flos Based on Ultra-high-performance Liquid Chromatography Coupled With Quadrupole-Orbitrap High-Resolution Mass Spectrometry and Self-Assembled Supramolecular Technology  -- *Used by: INT-0045.*
118. **[PMID 28630457]** How impaired efficacy happened between Gancao and Yuanhua: Compounds, targets and pathways  -- *Used by: INT-0045.*
119. **[PMID 38636577]** Investigation of the drug-drug interaction and incompatibility mechanism between Aconitum carmichaelii Debx and Pinellia ternata (Thunb.) Breit  -- *Used by: INT-0046.*
120. **[PMID 30258466]** Fuzi and Banxia Combination, Eighteen Antagonisms in Chinese Medicine, Aggravates Adriamycin-Induced Cardiomyopathy Associated with PKA/beta2AR-Gs Signaling  -- *Used by: INT-0046.*
121. **[PMID 34315520]** The toxicology and detoxification of Aconitum: traditional and modern views  -- *Used by: INT-0046, INT-0047, INT-0048.*
122. **[PMID 34650616]** Studies on the Incompatibility between Bulbus fritillariae and Radix aconiti praeparata Based on the P-gp  -- *Used by: INT-0047.*
123. **[PMID 29601980]** Pharmacological effect of prohibited combination pair Panax ginseng and Veratrum nigrum on colorectal metastasis in vitro and in vivo  -- *Used by: INT-0049.*
124. **[PMID 27229740]** Effect of the Interaction of Veratrum Nigrum with Panax Ginseng on Estrogenic Activity In Vivo and In Vitro  -- *Used by: INT-0049.*
125. **[PMID 34749105]** Incompatible effects of Panax ginseng and Veratrum nigrum on estrogen decline in rats using metabolomics and gut microbiota  -- *Used by: INT-0049.*
126. **[PMID 29747756]** Veratrum nigrum inhibits the estrogenic activity of salvia miltiorrhiza bunge in vivo and in vitro  -- *Used by: INT-0050.*
127. **[PMID 40265573]** UPLC-QTOF-MS-Based Quantification and Antiplatelet Activity Evaluation of Herb Pair Interactions Between Red Ginseng and Trogopterus Feces  -- *Used by: INT-0051.*
128. **[PMID 29218951]** Research on compatibility of prescriptions including Ginseng Radix et Rhizoma and Trogopterus Dung based on complex network analysis  -- *Used by: INT-0051.*
129. **[PMID 24369478]** Study on Incompatibility of Traditional Chinese Medicine: Evidence from Formula Network, Chemical Space, and Metabolism Room  -- *Used by: INT-0051.*

---

### Database / API references used for normalization (not interaction evidence)
- **RxNorm / RxNav (NIH NLM)** - `https://rxnav.nlm.nih.gov/` - used to fetch and verify EVERY `rxnorm_id`
  in `entities.json`. Verified CUIs: warfarin 11289, aspirin 1191, clopidogrel 32968, glipizide 4821,
  saquinavir 83395, hydrochlorothiazide 5487, cyclosporine 3008, tacrolimus 42316, simvastatin 36567,
  digoxin 3407, ethinylestradiol/norethindrone 384410, amlodipine 17767, omeprazole 7646, ibuprofen 5640,
  amiodarone 703, fluconazole 4450, clarithromycin 21212, gemfibrozil 4719, lisinopril 29046,
  spironolactone 9997, prednisolone 8638, sertraline 36437, indinavir 114289, metformin 6809.
