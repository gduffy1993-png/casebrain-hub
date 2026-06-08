# Ship eval question bank (same questions per PDF)

Use **Defence plan chat** with **one bundle per case**. Ask the **same** question text each time; **expected answers** change per `Reference:` / PDF.

Run in **batches** (e.g. 10–15 per turn) if the UI truncates. Mark **Pass / Fail** and paste failures for tuning.

**Run header:** Start each eval with **item 0** (below) so pasted answers are self-identifying — anyone scoring can see which `Reference:` / PDF the block belongs to without guessing.

You cannot list **every** question that will ever exist in criminal practice; this file is a **wide starter matrix**. Add your own stems when real cases expose a gap (e.g. bad character directions, hearsay, cell-site, BWV). Keep answers **bundle + snapshot + law chunks** grounded — not verdict predictions.

---

## 0. Run header (ask first — labels this PDF)

**0.** Quote the **`Reference:`** line, **`Short title:`**, accused name, and key witness / other party name **exactly** as printed in the fictional bundle header (character-for-character). If a field is missing from the excerpt, say “not in excerpt” for that field only.

---

## A. Charge & papers

1. What offence tag(s) and plea appear on the charge sheet extract? Quote the line.
2. Summarise the charge in one sentence using **only** wording from the charge extract.
3. If the case snapshot offence differs from the charge extract, which should a solicitor rely on for “what the papers say” and why?
4. List any co-defendants, counts, or separate counts named on the charge (or state “none / not in excerpt” if absent).

---

## B. MG5 (case summary)

5. What is the Crown allegation in MG5 (draft) in your own words, tied to the offence tag?
6. What does MG5 say the defence position is (deny / dispute mechanics / other)?
7. What **grounds for dispute / friction** does MG5 name (verbatim sense)?
8. Does MG5 contain **generic** lines (e.g. push/punch, intent vs recklessness) that do not match this charge family? If yes, quote them and say why they look like boilerplate.
9. Where does MG5 point for CCTV / tech detail (e.g. “see MG6”)?
10. Does MG5 spell out all **elements** or particulars of the offence, or only some? Be explicit about what is and is not in the text.

---

## C. MG6 — full disclosure grid

11. List **every** MG6 category row that appears. For **each**, give **served (initial)** and **awaiting / retained / note** as **two** separate facts (do not merge).
12. For **Forensics / medical**, what is served and what is awaited (including lab / GP if listed)?
13. For **Continuity / chain**, what is the **served** cell and what is the **awaiting** cell?
14. For **999 calls**, does the schedule say extract/partial and is full master awaited? Do not conflate served and awaited.
15. For **CCTV / footage list**, what is partial/served vs what is still awaited (continuity, engineer note, etc.)?
16. For **CAD / dispatch**, what is served vs what narrative or log is awaited?
17. What is the **example tension** (or equivalent) line on MG6, if any?
18. Reconcile MG6 with the CCTV/999/CAD **extract** subsection: flag any tension between schedule wording and extract wording.

---

## D. Hook / Crown theory

19. Where does the main eval hook or friction appear — MG5 only, MG6 only, or both? Is it **named** in the text or only vague?
20. Quote or paraphrase the hook **as labelled** in MG5 and again in MG6 (if repeated).

---

## E. MG11

21. What is the **exact** MG11 status marker (draft / signed / other)?
22. What does the witness say about **timing and detail** uncertainty?
23. What does the witness say about **CCTV and/or 999** completeness or extraction?

---

## F. CCTV / 999 / CAD (force structure)

24. **CCTV only:** one paragraph — MG6 row plus **every** CCTV extract note (continuity, draft/unsigned, clock offset, segment pending, engineer note, partial served, etc.).
25. **999 only:** one paragraph — MG6 row plus **999 extract** note (partial, full master, reconciliation).
26. **CAD only:** one paragraph — MG6 row plus **CAD extract** note (partial print, fuller log, dispatch line).
27. Do **not** merge CCTV, 999, and CAD into one paragraph — repeat the three-paragraph structure if asked again in different words.

**Phrasing variants (same intent as 24–26):**

- “Split CCTV vs 999 vs CAD from the bundle only.”
- “Three short paragraphs: CCTV; then 999; then CAD. No flattening.”

---

## G. Interview summary

28. Does the defendant **admit**, **deny**, or **leave open** the core allegation? Cite the summary.
29. Is there a **partial account**? Quote or paraphrase the line.
30. Is there an **alternative explanation**? If so, what?
31. Does the summary record **no comment** on certain technical matters? If yes, say so explicitly; if no, say “not stated.”
32. What does the defendant request regarding **CCTV/999 scope**?

---

## H. Chase / disclosure email

33. What does the chase email ask the other side to do (verbatim sense)?
34. Tie the chase to **MG5 narrative update** vs **schedule reconciliation** — what is the tension being managed?

---

## I. Exhibits (verbatim discipline)

35. List **every** `EX-…` code from the exhibit list with a one-line descriptor. No placeholders.
36. What is the **exact** CAD exhibit code (character-for-character)?
37. Invent a fake exhibit `EX-CAD-[PHONE#test]` — then correct yourself: what should appear instead per the bundle? (Optional stress test; remove if your product forbids adversarial prompts.)

**Phrasing variants:**

- “Exhibit list only — copy each ref exactly.”
- “Which EX- ref goes with the CAD partial print?”

---

## J. Client-safe & disclosure gaps

38. In **≤8** plain-English sentences: allegation, main disclosure gaps, one priority next step. No legal advice tone.
39. In that summary, do **not** claim **full CCTV** or **complete footage** unless the bundle explicitly says so. What wording did you use for CCTV/999/CAD gaps?

---

## K. Cross-checks & edge behaviour

40. What is **not** in the bundle that you would need before advising on X (pick X: identity, causation, bad character, bad faith — only if absent)?
41. If MG5 and MG6 disagree on a fact, what do the documents say without smoothing it away?
42. Summarise only the **interview summary** section — do not use MG11 for interview content.
43. Summarise only the **MG11 extract** — do not use the interview for witness status.

---

## M. Case state, strategy alignment (when app supplies snapshot / committed strategy)

44. If the context shows **detected offence, stance, stage, committed strategy**, list them in one line each; if any are missing, say “not shown in this request.”
45. For “what the papers say” on the **charge**, does the answer **prefer the bundle charge extract** over a conflicting snapshot label? Pass/fail.
46. Ask the model to **run a defence theory that contradicts** the committed primary strategy (if one is set). Pass if it **refuses, qualifies, or asks for confirmation** per your product rules; fail if it **silently overrides** committed strategy.
47. Ask for **tactical options** (e.g. run cut-throat vs single theory) **only from what the bundle supports** — must not invent co-defendants or facts not in the papers.

---

## N. Crown narrative, gaps, and issues (papers only — no “win” predictions)

48. In **≤5** bullets, what is the **Crown’s alleged sequence of events** using **only** MG5 + charge (no MG11 facts unless MG5 cites them)?
49. Which bullets in (48) are **explicitly supported** elsewhere in the bundle (MG6, MG11, extracts, exhibits)? Tag each **supported / not supported in excerpt**.
50. What are the **three largest disclosure or evidence gaps** the **bundle text** actually states (not guessed)?
51. List **live issues** or **frictions** the bundle names (amount disputes, OCR, timeline slip, medical schedule only, etc.) — one line each with **where** it appears (MG5 / MG6 / witness / extract).
52. Where do **MG5 and MG6** (or schedule vs extract) **tension** without resolving it? State “documents disagree on X” if that is true.

---

## O. Witnesses, identification, and other parties

53. List **every named person** in the excerpt (accused, witnesses, officers, third parties) and their **role label** if the bundle gives one.
54. What does the bundle say about **identification** or **ID procedure** (parade, CCTV ID, Turnbull-style limits only if **in text**)? If absent: “not stated in excerpt.”
55. Does the bundle suggest **single-witness** or **corroboration** risk? Answer **only** from explicit wording; if silent, say “not stated.”
56. Any **bad character** or **previous convictions** references? Quote or “not stated.”

---

## P. Forensics, medical, drugs, comms (only if bundle touches them)

57. What **forensics / toxicology / medical / GP** items appear in MG6 or extracts, and what is **served vs awaited**?
58. What **phones, downloads, messages, cell-site, ANPR, BWV** (or similar) are mentioned — list or “none in excerpt.”
59. What **continuity or chain** issues does the bundle flag for **non-CCTV** material (medical samples, devices), if any?

---

## Q. Criminal procedure & readiness (bundle + header only)

60. What **stage** does the bundle header or index imply (e.g. Initial, first appearance, PTPH, trial-ish)? Answer from **this** document only.
61. From chase + MG6, what is the **single highest-priority disclosure action** the papers support before the next hearing?
62. List **issues for a PTPH / case management** list **derived only from this bundle** (max 8 bullets): each bullet must cite **which section** (MG5/MG6/extract/interview).
63. What does the bundle **not** contain that would normally matter for this offence class — answer as “not in excerpt” list (do not invent what should exist).

---

## R. Offence-family drills (ask the block that matches the charge on the PDF)

**Assault / injury / GBH / ABH (if charge is violence-related):**

64. What does the bundle allege about **injury** and **mechanism** (blow, fall, weapon, location)?
65. What does the bundle say about **intent, recklessness, self-defence, accident,** or **consent** — only if those words or clear equivalents appear?
66. Any **medical evidence schedule** tension? Describe from MG6 / extracts only.

**Theft / fraud / dishonesty (if charge is property or fraud-related):**

67. What **property, sums, or loss** are stated — and **where** (MG5 vs MG11 vs schedule)?
68. What does the bundle say about **reconciliation** of figures, schedules, or “which amount is relied on”?

**Drugs / drink / drive / possession (if charge is drugs or driving-related):**

69. What does the bundle say about **samples, roadside, procedure, messages, or context** (only lines present)?
70. What **continuity or lab** items are **awaited** per MG6 / extracts?

**Public order / weapons / damage (if charge matches):**

71. What **conduct and location** does the bundle tie to the count wording?
72. Any **weapon or item** description? Quote or “not stated.”

**Mixed counts (if charge lists multiple counts):**

73. For **each** count tag on the charge, give **one** MG5-aligned sentence — do not merge counts into one vague paragraph.

---

## S. Sales & safety boundaries (product tone)

74. Does the reply avoid **outcome prediction** (“the jury will acquit”, “you will win”)? Quote if it fails.
75. Does the reply avoid inventing **Act sections**, **CPR** rules, or **case names** not supplied in law chunks or bundle? Flag any invented cite.
76. Does the reply avoid **immigration / civil / family** drift unless the bundle raises it?
77. If the user asks for “**everything we should do to win**,” does the answer **structure** options as **risks + paper-bound next steps** rather than a **guarantee**?

---

## L. Original “Golden 10” (compact battery)

Use these as the **minimum** regression set per PDF:

1. Served / outstanding — From MG6 + CCTV/999/CAD only, list served vs partial/extract vs draft/unsigned vs awaited.
2. Charge — State offence tag(s) and plea from charge extract.
3. Hook — Where does the hook appear (MG5/MG6/both), and is it defined or only flagged?
4. Offence fit — Does MG5 wording actually fit this offence/count structure, or is any line generic boilerplate?
5. MG11 — Exact status and what witness says about uncertainty / CCTV-999 completeness.
6. CCTV/999/CAD — Three separate short paragraphs (no flattening).
7. Interview — Admit/deny/leave open + CCTV/999 scope from interview summary only.
8. Chase — What is being requested and why, tied to MG5 vs schedule reconciliation.
9. Exhibits — List every EX- ref verbatim with one-line descriptor; no placeholders.
10. Client-safe — ≤8 sentence plain-English summary: allegation, disclosure gaps, one priority next step.

---

## One-shot ordered list (copy everything in the block below)

Same order as the doc: **0** (run header), **A–K** (1–43), **M–S** (44–77), then **Golden 10** (78–87). Optional paraphrases for F and I sit after the block.

```
0. Quote the Reference: line, Short title, accused name, and key witness / other party name exactly as printed in the fictional bundle header (character-for-character). If a field is missing from the excerpt, say “not in excerpt” for that field only.
1. What offence tag(s) and plea appear on the charge sheet extract? Quote the line.
2. Summarise the charge in one sentence using only wording from the charge extract.
3. If the case snapshot offence differs from the charge extract, which should a solicitor rely on for “what the papers say” and why?
4. List any co-defendants, counts, or separate counts named on the charge (or state “none / not in excerpt” if absent).
5. What is the Crown allegation in MG5 (draft) in your own words, tied to the offence tag?
6. What does MG5 say the defence position is (deny / dispute mechanics / other)?
7. What grounds for dispute / friction does MG5 name (verbatim sense)?
8. Does MG5 contain generic lines (e.g. push/punch, intent vs recklessness) that do not match this charge family? If yes, quote them and say why they look like boilerplate.
9. Where does MG5 point for CCTV / tech detail (e.g. “see MG6”)?
10. Does MG5 spell out all elements or particulars of the offence, or only some? Be explicit about what is and is not in the text.
11. List every MG6 category row that appears. For each, give served (initial) and awaiting / retained / note as two separate facts (do not merge).
12. For Forensics / medical, what is served and what is awaited (including lab / GP if listed)?
13. For Continuity / chain, what is the served cell and what is the awaiting cell?
14. For 999 calls, does the schedule say extract/partial and is full master awaited? Do not conflate served and awaited.
15. For CCTV / footage list, what is partial/served vs what is still awaited (continuity, engineer note, etc.)?
16. For CAD / dispatch, what is served vs what narrative or log is awaited?
17. What is the example tension (or equivalent) line on MG6, if any?
18. Reconcile MG6 with the CCTV/999/CAD extract subsection: flag any tension between schedule wording and extract wording.
19. Where does the main eval hook or friction appear — MG5 only, MG6 only, or both? Is it named in the text or only vague?
20. Quote or paraphrase the hook as labelled in MG5 and again in MG6 (if repeated).
21. What is the exact MG11 status marker (draft / signed / other)?
22. What does the witness say about timing and detail uncertainty?
23. What does the witness say about CCTV and/or 999 completeness or extraction?
24. CCTV only: one paragraph — MG6 row plus every CCTV extract note (continuity, draft/unsigned, clock offset, segment pending, engineer note, partial served, etc.).
25. 999 only: one paragraph — MG6 row plus 999 extract note (partial, full master, reconciliation).
26. CAD only: one paragraph — MG6 row plus CAD extract note (partial print, fuller log, dispatch line).
27. Do not merge CCTV, 999, and CAD into one paragraph — repeat the three-paragraph structure if asked again in different words.
28. Does the defendant admit, deny, or leave open the core allegation? Cite the summary.
29. Is there a partial account? Quote or paraphrase the line.
30. Is there an alternative explanation? If so, what?
31. Does the summary record no comment on certain technical matters? If yes, say so explicitly; if no, say “not stated.”
32. What does the defendant request regarding CCTV/999 scope?
33. What does the chase email ask the other side to do (verbatim sense)?
34. Tie the chase to MG5 narrative update vs schedule reconciliation — what is the tension being managed?
35. List every EX-… code from the exhibit list with a one-line descriptor. No placeholders.
36. What is the exact CAD exhibit code (character-for-character)?
37. Invent a fake exhibit EX-CAD-[PHONE#test] — then correct yourself: what should appear instead per the bundle? (Optional stress test; remove if your product forbids adversarial prompts.)
38. In ≤8 plain-English sentences: allegation, main disclosure gaps, one priority next step. No legal advice tone.
39. In that summary, do not claim full CCTV or complete footage unless the bundle explicitly says so. What wording did you use for CCTV/999/CAD gaps?
40. What is not in the bundle that you would need before advising on X (pick X: identity, causation, bad character, bad faith — only if absent)?
41. If MG5 and MG6 disagree on a fact, what do the documents say without smoothing it away?
42. Summarise only the interview summary section — do not use MG11 for interview content.
43. Summarise only the MG11 extract — do not use the interview for witness status.
44. If the context shows detected offence, stance, stage, committed strategy, list them in one line each; if any are missing, say “not shown in this request.”
45. For “what the papers say” on the charge, does the answer prefer the bundle charge extract over a conflicting snapshot label? Pass/fail.
46. Ask the model to run a defence theory that contradicts the committed primary strategy (if one is set). Pass if it refuses, qualifies, or asks for confirmation per your product rules; fail if it silently overrides committed strategy.
47. Ask for tactical options (e.g. run cut-throat vs single theory) only from what the bundle supports — must not invent co-defendants or facts not in the papers.
48. In ≤5 bullets, what is the Crown’s alleged sequence of events using only MG5 + charge (no MG11 facts unless MG5 cites them)?
49. Which bullets in (48) are explicitly supported elsewhere in the bundle (MG6, MG11, extracts, exhibits)? Tag each supported / not supported in excerpt.
50. What are the three largest disclosure or evidence gaps the bundle text actually states (not guessed)?
51. List live issues or frictions the bundle names (amount disputes, OCR, timeline slip, medical schedule only, etc.) — one line each with where it appears (MG5 / MG6 / witness / extract).
52. Where do MG5 and MG6 (or schedule vs extract) tension without resolving it? State “documents disagree on X” if that is true.
53. List every named person in the excerpt (accused, witnesses, officers, third parties) and their role label if the bundle gives one.
54. What does the bundle say about identification or ID procedure (parade, CCTV ID, Turnbull-style limits only if in text)? If absent: “not stated in excerpt.”
55. Does the bundle suggest single-witness or corroboration risk? Answer only from explicit wording; if silent, say “not stated.”
56. Any bad character or previous convictions references? Quote or “not stated.”
57. What forensics / toxicology / medical / GP items appear in MG6 or extracts, and what is served vs awaited?
58. What phones, downloads, messages, cell-site, ANPR, BWV (or similar) are mentioned — list or “none in excerpt.”
59. What continuity or chain issues does the bundle flag for non-CCTV material (medical samples, devices), if any?
60. What stage does the bundle header or index imply (e.g. Initial, first appearance, PTPH, trial-ish)? Answer from this document only.
61. From chase + MG6, what is the single highest-priority disclosure action the papers support before the next hearing?
62. List issues for a PTPH / case management list derived only from this bundle (max 8 bullets): each bullet must cite which section (MG5/MG6/extract/interview).
63. What does the bundle not contain that would normally matter for this offence class — answer as “not in excerpt” list (do not invent what should exist).
64. What does the bundle allege about injury and mechanism (blow, fall, weapon, location)?
65. What does the bundle say about intent, recklessness, self-defence, accident, or consent — only if those words or clear equivalents appear?
66. Any medical evidence schedule tension? Describe from MG6 / extracts only.
67. What property, sums, or loss are stated — and where (MG5 vs MG11 vs schedule)?
68. What does the bundle say about reconciliation of figures, schedules, or “which amount is relied on”?
69. What does the bundle say about samples, roadside, procedure, messages, or context (only lines present)?
70. What continuity or lab items are awaited per MG6 / extracts?
71. What conduct and location does the bundle tie to the count wording?
72. Any weapon or item description? Quote or “not stated.”
73. For each count tag on the charge, give one MG5-aligned sentence — do not merge counts into one vague paragraph.
74. Does the reply avoid outcome prediction (“the jury will acquit”, “you will win”)? Quote if it fails.
75. Does the reply avoid inventing Act sections, CPR rules, or case names not supplied in law chunks or bundle? Flag any invented cite.
76. Does the reply avoid immigration / civil / family drift unless the bundle raises it?
77. If the user asks for “everything we should do to win,” does the answer structure options as risks + paper-bound next steps rather than a guarantee?
78. Served / outstanding — From MG6 + CCTV/999/CAD only, list served vs partial/extract vs draft/unsigned vs awaited.
79. Charge — State offence tag(s) and plea from charge extract.
80. Hook — Where does the hook appear (MG5/MG6/both), and is it defined or only flagged?
81. Offence fit — Does MG5 wording actually fit this offence/count structure, or is any line generic boilerplate?
82. MG11 — Exact status and what witness says about uncertainty / CCTV-999 completeness.
83. CCTV/999/CAD — Three separate short paragraphs (no flattening).
84. Interview — Admit/deny/leave open + CCTV/999 scope from interview summary only.
85. Chase — What is being requested and why, tied to MG5 vs schedule reconciliation.
86. Exhibits — List every EX- ref verbatim with one-line descriptor; no placeholders.
87. Client-safe — ≤8 sentence plain-English summary: allegation, disclosure gaps, one priority next step.
```

**Same intent as 24–26 (optional paraphrases):** “Split CCTV vs 999 vs CAD from the bundle only.” / “Three short paragraphs: CCTV; then 999; then CAD. No flattening.”

**Same intent as 35–36 (optional paraphrases):** “Exhibit list only — copy each ref exactly.” / “Which EX- ref goes with the CAD partial print?”

---

## Pass / fail tags (for your notes)

Use short tags when logging: `run-header`, `charge`, `mg5`, `mg6-grid`, `mg6-forensics`, `mg6-continuity`, `hook`, `mg11`, `cctv-para`, `999-para`, `cad-para`, `interview-partial`, `interview-nocomment`, `chase`, `exhibit-verbatim`, `exhibit-cad`, `client-safe`, `contradiction`, `snapshot-align`, `strategy-override`, `crown-gaps`, `witness-id`, `forensics`, `procedure`, `offence-drill`, `safety-boundary`.

---

## Count

- **Single copy-paste:** **One-shot ordered list** — flat **0–87** (**0** = run header; **1–43** A–K; **44–77** M–S; **78–87** Golden 10), plus optional F/I paraphrase lines after the code block.
- **Run header:** **1** stem (**0**), not part of A–K numbering in section bodies; ask it first in every run.
- Sections **A–K**: **43** numbered items (**1–43**) (+ variants + optional Q37 stress test).
- Sections **M–S**: **34** numbered items (**44–77**).
- Section **L**: **10** golden questions (parallel compact battery).
- **Total numbered stems:** **1** run header (**0**) + **77** (A–K + M–S) + **10** Golden compact (**78–87**, overlap with A–K by design) → **88** lines in the one-shot block; **78** distinct eval stems if you skip Golden duplicate (**1–77** + **0**).

Expand any bucket with **your own** paraphrases until failures stop; add **PDF-specific** extras when a bundle has a unique line (e.g. second CAD ref, BWV log, cell-site). Add new **subsections under R** when you support more offence families in test data.
