# Ship eval question bank (same questions per PDF)

Use **Defence plan chat** with **one bundle per case**. Ask the **same** question text each time; **expected answers** change per `Reference:` / PDF.

Run in **batches** (e.g. 10–15 per turn) if the UI truncates. Mark **Pass / Fail** and paste failures for tuning.

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

## Pass / fail tags (for your notes)

Use short tags when logging: `charge`, `mg5`, `mg6-grid`, `mg6-forensics`, `mg6-continuity`, `hook`, `mg11`, `cctv-para`, `999-para`, `cad-para`, `interview-partial`, `interview-nocomment`, `chase`, `exhibit-verbatim`, `exhibit-cad`, `client-safe`, `contradiction`.

---

## Count

- Sections **A–K**: **43** numbered items (+ a few variants + optional Q37 stress test).
- Section **L**: **10** golden questions.
- **Total core stems**: **53** distinct asks (re-use L inside A–K if you want to avoid duplication — many teams run **L only** weekly and **A–K** once per PDF).

Expand any bucket with **your own** paraphrases until failures stop; add **PDF-specific** extras only when that bundle has a unique line (e.g. second CAD ref).
