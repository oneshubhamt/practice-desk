# PFRDA Grade A 2026 — Day 1: editorial repair and verification ledger

**Scope:** the 50 original AI-created Paper 2 MCQs and one original Day 1 Paper 1 précis exercise. This is not an official PYQ, independent certification or prediction of the real paper's difficulty.

## Changes implemented

1. **Original source preserved:** recovery inputs live under `archive/` (`original-50-questions.json`, `recovered-day1.authoring.json`, the English reference and historical answer index). The active `original/` package preserves all 50 original MCQ stems, all 200 original options and all answer letters; its only material practice-configuration change is the 20-mark English manual rule. The active `revised/` package is a distinct immutable revision.
2. **Explanation quality:** 50 of 50 Paper 2 explanations have been rewritten with the key, the rule or formula, explicit reasons for competing options being wrong, and a high-yield distinction. Q9, Q18, Q19, Q27, Q29, Q40 and Q47 receive worked remediation of the user's Day 1 mistakes.
3. **Options:** exactly 12 complete *distractor groups* revised, for Q13, 23, 25, 31, 34, 35, 38, 39, 41, 43, 44 and 48. Their question stems, IDs and answer letters do **not** change. This is a targeted improvement, not a claim that all items are now difficult.
4. **Q42:** fixes the BPM6 distinction: personal transfers/remittances usually **current account—secondary income**; FDI, external commercial borrowing and reserves transactions **financial account**, not generically “capital account”. RBI is cited in answer-side provenance.
5. **Q49:** removes the obsolete missing-source explanation; clarifies Companies Act §§173(1) (Board meetings), 410 (NCLAT constitution), and **421 (NCLT appeals)**. Both statements remain true and key D is unchanged.
6. **English title leak:** the improved candidate passage is headed **“Untitled passage for précis”**. The historical source-playback heading remains intact for comparison; the model answer title is still answer-side only.
7. **Manual marking:** adds per-question `scoringOverride` to the canonical external authoring-to-publishing path **and a checkbox-controlled marks editor in Authoring Studio**. The English rubric can use 0–20 marks, MCQs still +2/−0.5/0. The 100-mark automated MCQ denominator excludes free-response pending manual marking. The change is optional and does not alter existing imported papers.
8. **Evidence metadata:** retains existing Budget, Economic Survey, statutory and scheme source links and adds ICAI inventory guidance, ICMAI costing/variance guidance, RBI BoP terminology, PFRDA CRA/NPS information, and Section 421 to the Companies Act reference.

## Verification

| Check | Result |
| --- | --- |
| Original question stems, IDs and keys match improved practice | **50/50** exact |
| Source-playback original MCQ options | **200/200** exact |
| Improved option groups | **12** modified; **38** untouched |
| Revised explanations | **50/50** present; individually drafted and cross-checked against A–D option order |
| Canonical bank validation / compilation | **51 questions, 2 timed sections; valid** for source-playback and improved practice |
| Automatic MCQ maximum and rules | **100 marks; +2 correct / −0.5 wrong / 0 unattempted** |
| Précis manual grade ceiling | **20** |
| Original submitted 50-answer response replay | **43 right, 7 wrong, 0 skipped; 82.5/100**; précis was not assumed attempted |
| Targeted external authoring test suite | **36/36 passed** (including the new marking and historical-fidelity checks) |
| Studio view/controller syntax check | **Passed** (`node --check` on both modified Studio files) |
| Whole-repo typecheck / fast suite | **Pending branch CI after repository-wide question-bank reorganization and merge with current `working`**; prior targeted authoring checks are retained as historical evidence, not a substitute for this gate |
| Independent legal-currentness certification | **Not completed; 11 automated advisory warnings remain** |

The program's quality scanner intentionally reports `legal-currentness-unverified` even when a dated, provision-specific citation exists: it cannot itself inspect commencement orders, every later statutory amendment or subordinate rule. A reference and a reasoned manual check are not an independently signed publication review. The packages retain truthful `qa: needs-review` metadata and **do not bypass** this gate.

## High-yield primary references

- [PFRDA Act, 2013](https://upload.indiacode.nic.in/showfile?actid=AC_CEN_2_45_00007_201323_1517807327819&filename=201323.pdf&type=actfile), especially §§14, 51–52.
- [Companies Act, 2013 (India Code)](https://www.indiacode.nic.in/bitstream/123456789/2114/5/A2013-18.pdf), especially §§42, 62–63, 123, 143, 149, 173, 410–421.
- [Union Budget 2026–27 FRBM material](https://www.indiabudget.gov.in/doc/frbm1.pdf) and [Budget Speech](https://www.indiabudget.gov.in/doc/Budget_Speech.pdf), distinguishing direct and effective capex and fiscal-deficit BE.
- [Economic Survey 2025–26 official chapters](https://www.indiabudget.gov.in/economicsurvey/doc/echapter.pdf), including growth projections and PFCE estimates.
- [ICAI AS 2 — Inventories](https://kb.icai.org/pdfs/69232asb55316-as2.pdf), [ICMAI cost accounting material](https://www.icmai.in/upload/Students/Syllabus2022/Inter_Stdy_Mtrl/P8.pdf), [ICMAI standard costing/variance material](https://icmai.in/upload/Students/Syllabus2022/Inter_Stdy_Mtrl/P12_160824.pdf).
- [PFRDA Central Recordkeeping Agencies](https://pfrda.org.in/en/intermediaries/registered-intermediaries/central-record-keeping-agency), [RBI Balance of Payments concepts](https://rbi.org.in/scripts/PublicationsView.aspx?id=13013).

**Editorial status:** improved and schema-validated practice only. Before calling it a *formally reviewed publication*, perform the repository's separate, source-hash-bound blind evidence review and legal effective-date check. The original Day 1 diagnostic and the user's historical result remain immutable.
