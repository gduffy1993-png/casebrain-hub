# Golden 10 — regression log (wrong answers & fix queue)

Living doc: append a block **per ref** after each run. Questions = `GOLDEN_10_QUESTION_PACK.md` (core 10).

**Scoring note:** If you upload a PDF that **differs** from `docs/fictional-golden-10/NS-CPS-2026-XXXX.txt` (e.g. older generator, WRIGHT2 typo), log which **source** you tested so fixes target the right file.

---

## NS-CPS-2026-0436 — run logged (user paste / non-canonical golden)

**Source tested:** User-provided bundle text (accused **ZARA WRIGHT2**, witness **MORGAN OSBORNE**, MG5 includes push/punch + possession/supply lines). **Not** identical to repo `NS-CPS-2026-0436.txt` in this folder (canonical uses **ZARA WRIGHT**, cleaner MG5).

**Questions:** Core Q1–10 (Q6 output not pasted in thread for this run).

### Failures observed (CaseBrain vs bundle text)

| Q | Issue |
|---|--------|
| **1** | **Incomplete MG6:** omitted or blurred rows (e.g. MG5 “final after reconciliation”, **Forensics / medical**, **Continuity / chain**). **999:** conflated MG6 row with extract note — used “full master” awaited without cleanly separating **schedule wording** vs **999 extract note** (partial extract / master awaited). |
| **3** | **Hook wrong:** “Metadata optional” should be cited in **MG5** (grounds) **and** **MG6** (tension note). Answer described hook as allegation consistency instead of the **named** hook. |
| **4** | **Too soft:** should state MG5 contains **generic** push/punch / intent-recklessness and **possession/supply** lines **ill-fitting** drug driving (per that PDF). |
| **5** | **MG11 status muddled:** body says **signed statement** but answer mixed in **“possibly draft”** from **MG6** schedule — should keep **status marker** vs **schedule** separate. |
| **6** | **Missing** from paste — confirm second batch sent / not truncated. |
| **7** | **Minor:** interview block doesn’t name defendant; “Zara Wright2” is inferential — prefer “the defendant.” Substance otherwise OK. |
| **9** | **EX-CAD hallucination:** `EX-CAD-[PHONE#…]` instead of verbatim **`EX-CAD-800436`**. |
| **10** | **Invented gaps:** e.g. “full CCTV window” — conflicts with CCTV note **tidy / continuity confirmed** on that PDF. Should tie gaps to **MG6 + notes** only. |

### Fix queue (where to act)

| Layer | Action |
|-------|--------|
| **Product / prompt** | Stronger **verbatim copy** for exhibit lines; **separate** MG11 **status line** vs MG6 **possibly draft**; **hook** must cite **all** locations text names; **client-safe** must not invent disclosure gaps; **MG6** = **every category row**. |
| **Optional validator** | Reject any `EX-…` in reply not substring of bundle excerpt; flag MG6 answers missing category keywords. |
| **Bundle (if keeping WRIGHT2 PDF)** | Fix **MG6 table layout** if pipes/rows misaligned in PDF; align **999** row vs **999 note** tension deliberately for teaching. |
| **Canonical golden** | Prefer regression on `docs/fictional-golden-10/NS-CPS-2026-0436.pdf` / `.txt` for stable scoring. |

---

## NS-CPS-2026-0431 — run logged (user paste)

**Source tested:** User-provided bundle (**LIAM PARKER**, **DECLAN ELLIS**, hook **Victim timeline slip**, **Theft person (snatch)**). Index/charge section lines are slightly ragged in paste; core sections read clearly.

**Questions:** Core Q1–10 (full batch pasted).

### Failures observed (CaseBrain vs bundle text)

| Q | Issue |
|---|--------|
| **1** | **Awaiting errors/incomplete:** **Forensics / medical** → **lab report / GP records** omitted. **Continuity:** answer listed **draft or unsigned** under **awaiting** — that is the **served** side for continuity; **awaiting** is **corrected continuity to be provided** (per standard MG6 template). |
| **2** | **OK** |
| **3** | **Incomplete:** **Victim timeline slip** in **MG5** (grounds) **and** **MG6** (example tension). Answer said **MG5 only**. **Flagged**, not fully **defined** (no detailed timeline text). |
| **4** | **Wrong:** **Push/punch / intent vs recklessness** is **generic** defence boilerplate for a **theft/snatch** framing — should be called out; injury-style mechanics are **less** central than for ABH. |
| **5** | **OK** |
| **6** | **Minor bleed:** CCTV paragraph uses **MG11** “incomplete/extracted” flavour; **CCTV extract note** is **continuity draft/unsigned**. |
| **7** | **Incomplete:** Missing **no comment** on **certain technical** matters; **alternative explanation** branch omitted. |
| **8** | **OK** |
| **9** | **EX-CAD hallucination:** `EX-CAD-[PHONE#…]` — correct **`EX-CAD-800431`**. |
| **10** | **Overbroad:** “**Full CCTV footage**” not stated; **partial** + **continuity** issues. Gaps should follow **MG6 + notes** (999 master, CAD narrative, forensics, corrected continuity, etc.). |

---

## NS-CPS-2026-0432 — run logged (user paste)

**Source tested:** User-provided bundle (**KIAN BROOKS**, **AARON THORNTON**, hook **Medical schedule only**, **s.47 ABH domestic-flavoured**).

**Questions:** Core Q1–10 (full batch pasted).

### Failures observed (CaseBrain vs bundle text)

| Q | Issue |
|---|--------|
| **1** | **Awaiting incomplete:** missing **Forensics / medical** → **lab report / GP records** (and ensure **continuity** row fully mirrored: **draft or unsigned** served / **corrected continuity** awaited). Otherwise broadly aligned. |
| **2** | **OK** |
| **3** | **Incomplete:** **Medical schedule only** appears in **MG5** (grounds) **and** **MG6** (example tension). Answer said **MG5 only**. Phrase is **flagged**, not a full definition of what “medical schedule only” means in evidence terms. |
| **4** | **Debatable / soft:** **Push/punch / intent vs recklessness** is still **formula** defence wording; for **ABH** it is **less** ill-fitting than on fraud/drug driving, but answer could note **formulaic** line vs **specific** injury narrative. Saying **zero** boilerplate is **too strong**. |
| **5** | **OK** (draft, signature pending; uncertainty; incomplete/extracted CCTV-999). |
| **6** | **Minor bleed:** CCTV paragraph imports **MG11**-style “incomplete or extracted” — CCTV **extract note** is **continuity draft/unsigned**. Keep paragraphs tied to **CCTV / 999 / CAD** sections primarily. |
| **7** | **Wrong:** **No comment** on **certain technical** matters — not “leaves open.” |
| **8** | **OK** |
| **9** | **EX-CAD hallucination:** `EX-CAD-[PHONE#…]` — correct **`EX-CAD-800432`**. |
| **10** | **Overbroad:** “**Full CCTV footage**” not stated; text = **continuity** issues + **partial** material. Gaps should track **MG6 + notes** (999 master, CAD narrative, forensics, continuity, etc.). |

---

## NS-CPS-2026-0433 — run logged (user paste)

**Source tested:** User-provided bundle text (**CALLUM ADAMS**, **ALEX HASSAN**, hook **Work tool defence**). MG6 table formatting in paste is ragged; scoring uses **intended seven rows** (MG5, MG11, CCTV, 999, CAD, Forensics, Continuity) as in standard Northshire template.

**Questions:** Core Q1–10 (full batch pasted).

### Failures observed (CaseBrain vs bundle text)

| Q | Issue |
|---|--------|
| **1** | **Mostly served-only; awaiting column largely missing.** Should include e.g. **MG5** → final after reconciliation; **MG11** → signed copy if draft; **CCTV** → continuity statement / engineer note; **999** → tension: MG6 row vs **999 note** (partial extract / master awaited); **CAD** → fuller narrative; **Forensics** → lab / GP records; **Continuity** → **none** (confirmed row). Answer also **merges** 999 served vs “full audio served (with timestamp)” wording without separating **schedule vs extract note**. |
| **2** | **OK** (possession offensive weapon non-blade; not guilty). |
| **3** | **Incomplete:** **Work tool defence** appears in **MG5** (grounds) **and** **MG6** (example tension). Answer said **MG5 only**. Hook is **flagged**, not a full legal definition of “work tool.” |
| **4** | **Wrong:** MG5 includes **push/punch / intent vs recklessness** — **generic** for this weapon charge; answer claimed **no** boilerplate. |
| **5** | **OK** (signed; uncertainty; CCTV/999 may be incomplete/extracted). |
| **6** | **OK** (three paragraphs; 999 tension vs MG6 is implicit — could name tension explicitly). |
| **7** | **Wrong:** Summary says **no comment** on **certain technical** matters — not “leaves open.” **Request full disclosure** of CCTV/999 scope should be explicit. |
| **8** | **OK** (chase / reconciliation). |
| **9** | **EX-CAD hallucination:** `EX-CAD-[PHONE#…]` — correct **`EX-CAD-800433`**. |
| **10** | **Overbroad:** CCTV note says **tidy; continuity confirmed** — do not claim **“full CCTV footage”** gap unless text says so. Tie gaps to **MG6 + notes**. |

### Fix queue

Same standing items as 0434/0436: **full MG6 both columns**, **hook in MG5+MG6**, **interview verbatim**, **verbatim EX-CAD**, **client-safe** only from text.

---

## NS-CPS-2026-0434 — run logged (user paste)

**Source tested:** User-provided bundle text (**NEIL MITCHELL2**, witness **SAM MORGAN**, hook **MG5 £ vs MG11 £**). Compare with canonical `NS-CPS-2026-0434.txt` in this folder (**NEIL MITCHELL**, **£420 vs £460** lines) if scoring golden-only.

**Questions:** Core Q1–10 (full batch pasted).

### Failures observed (CaseBrain vs bundle text)

| Q | Issue |
|---|--------|
| **1** | **Awaiting incomplete:** MG6 row **Forensics / medical** → **lab report / GP records** not listed. Otherwise rows broadly OK. |
| **3** | **Hook location wrong:** **“MG5 £ vs MG11 £”** appears in **MG5** (grounds) and **MG6** (example tension). Answer said **MG5 and MG11** — **MG11** is not where the hook line is printed (the £ *tension* is named in MG5/MG6; MG11 is witness statement, not the hook index). |
| **4** | **Too soft:** MG5 includes **push/punch / intent vs recklessness** boilerplate — **poor fit** for **fraud retail refund**; should say so plainly. Bundle does **not** print two £ figures—only flags **MG5 £ vs MG11 £**; answer could note amounts **not stated** if asked. |
| **5** | **OK** (draft, signature pending; uncertainty; CCTV/999 incomplete/extracted). |
| **6** | **OK** (three separate tensions). |
| **7** | **Wrong on interview:** summary says **no comment** on **certain technical** matters — answer said **“leaves … open”** (different). **Requests full disclosure** of CCTV/999 scope — present in spirit; should quote **no comment** + **request** explicitly. |
| **8** | **OK** (chase email purpose). |
| **9** | **EX-CAD hallucination:** `EX-CAD-[PHONE#…]` — correct verbatim **`EX-CAD-800434`**. |
| **10** | **Overbroad gaps:** “**full CCTV footage**” oversells; text says **partial** list + **continuity** issues. Prefer gaps tied to **MG6 + notes** (999 master, CAD narrative, forensics, continuity, etc.). Priority (reconcile MG5/schedule) **OK**. |

### Fix queue (where to act)

| Layer | Action |
|-------|--------|
| **Product / prompt** | Hook = cite **MG5 + MG6** when phrase appears there; interview = **verbatim** “no comment” + “requests full disclosure”; exhibits = **character copy** of CAD line; Q1 = **all seven** MG6 categories in awaiting column. |
| **Optional validator** | Same as 0436: any `EX-…` not in bundle → fail. |
| **Bundle** | Canonical golden 0434 adds **explicit £ amounts** for stricter Q&A; user paste is **flag-only**. |

---

## NS-CPS-2026-0435 — run logged (user paste)

**Source tested:** User-provided bundle (**PAIGE CLARK**, **TAYLOR PRICE**, hook **Contradictory officer summaries**, **Public order s.4 + CD**, **PTPH**).

**Questions:** Core Q1–10 (full batch pasted).

### Failures observed (CaseBrain vs bundle text)

| Q | Issue |
|---|--------|
| **1** | **Awaiting incomplete:** Missing **Forensics / medical** → **lab report / GP records**. Rest of awaiting list broadly OK. |
| **2** | **OK** |
| **3** | **Incomplete:** **Contradictory officer summaries** appears in **MG5** (grounds) **and** **MG6** (example tension). Answer said **MG5 only**. Phrase is **flagged**, not a full account of the contradiction. |
| **4** | **Too strong:** **Push/punch / intent vs recklessness** is still **template** wording — note **formula** even if **s.4 + CD** is closer than fraud/handling. |
| **5** | **OK** |
| **6** | **OK** |
| **7** | **Wrong:** Omits **no comment** on **certain technical** matters and **partial account** opening line. |
| **8** | **OK** |
| **9** | **EX-CAD hallucination:** `EX-CAD-[PHONE#…]` — correct **`EX-CAD-800435`**. |
| **10** | **Overbroad:** “**Full CCTV window**” — text = **partial** + **continuity draft/unsigned**; tie gaps to **MG6 + notes**. |

**Golden 10:** All **10** refs in this log now have a run entry (order in file varies; set is **0431, 0432, 0433, 0434, 0435, 0436, 0437, 0438, 0439, 0440**).

---

## NS-CPS-2026-0437 — run logged (user paste)

**Source tested:** User-provided bundle (**VINCENT COATES**, **JORDAN PATEL**, hook **Multi-victim order muddled**, **Burglary dwell + s.47**). Bundle pasted twice identically in thread — scored once.

**Questions:** Core Q1–10 (full batch pasted).

### Failures observed (CaseBrain vs bundle text)

| Q | Issue |
|---|--------|
| **1** | **Awaiting incomplete:** **Forensics / medical** → **lab report / GP records** not listed. Served column broadly OK. |
| **2** | **OK** |
| **3** | **Partially wrong wording:** Hook appears **MG5 + MG6** — **correct**. But it is **flagged** (“multi-victim order muddled”), **not** “defined” with victim list/order in the text. |
| **4** | **Too strong:** **Push/punch / intent vs recklessness** line is still **formula**; **burglary + s.47** also has **specific** injury narrative — answer should acknowledge **formula** vs **specific** lines. |
| **5** | **OK** |
| **6** | **OK** (minor “reliability” spin — still grounded). |
| **7** | **Mostly OK** — **no comment** + **full disclosure** present; could add **partial account** and **alternative explanation** branches from summary. |
| **8** | **OK** |
| **9** | **EX-CAD hallucination:** `EX-CAD-[PHONE#…]` — correct **`EX-CAD-800437`**. |
| **10** | **Overbroad:** “**Full CCTV footage**” — text = **partial** + **continuity** issues; align gaps to **MG6 + notes**. |

---

## NS-CPS-2026-0438 — run logged (user paste)

**Source tested:** User-provided bundle (**DECLAN REES2**, **ROWAN MURRAY**, hook **Third party ‘Carl’**, **Handling stolen goods**).

**Questions:** Core Q1–10 (full batch pasted).

### Failures observed (CaseBrain vs bundle text)

| Q | Issue |
|---|--------|
| **1** | **Awaiting incomplete:** Missing **CCTV** → **continuity statement / engineer note**; missing **Forensics / medical** → **lab report / GP records**. Rest broadly OK. |
| **2** | **OK** |
| **3** | **Incomplete:** **Carl** appears in **MG5** (grounds) **and** **MG6** (example tension). Answer said **MG5 only**. **Flagged** only — **correct** on no detail. |
| **4** | **OK / soft:** Should explicitly call **push/punch / intent vs recklessness** **poor fit** for **handling**; “draft may be generic” is acceptable but weaker than naming the misfit line. |
| **5** | **OK** |
| **6** | **OK** |
| **7** | **Incomplete:** Add **partial account** and **denies core or alternative explanation** branches; **no comment** + **request disclosure** — **good**. |
| **8** | **OK** |
| **9** | **EX-CAD hallucination:** `EX-CAD-[PHONE#…]` — correct **`EX-CAD-800438`**. |
| **10** | **Overbroad:** “**Complete CCTV footage**” — text = **partial** + **continuity draft/unsigned**; prefer gaps from **MG6 + notes**. |

---

## NS-CPS-2026-0439 — run logged (user paste)

**Source tested:** User-provided bundle (**AARON ROSS**, **DANIEL REID**, hook **Wrong name OCR on index**, **Affray + assault PC**). PDF pasted twice identically — scored once.

**Questions:** Core Q1–10 (full batch pasted).

### Failures observed (CaseBrain vs bundle text)

| Q | Issue |
|---|--------|
| **1** | **Awaiting incomplete:** Missing **Forensics / medical** → **lab report / GP records**. (CCTV continuity line present as “continuity statement” — acceptable shorthand if engineer note implied.) |
| **2** | **OK** |
| **3** | **Incomplete:** **Wrong name OCR on index** appears in **MG5** (grounds) **and** **MG6** (example tension). Answer said **MG5 only**. |
| **4** | **Debatable:** **Push/punch / intent vs recklessness** is still **template** wording; for **affray + assault PC** it is **less** inappropriate than for fraud/handling — could still note **formula** vs **charge tag** only. Saying **zero** boilerplate is **strong**. |
| **5** | **OK** |
| **6** | **OK** |
| **7** | **Wrong:** Omits **no comment** on **certain technical** matters. **Denies / alternative** + **request disclosure** — partially OK. |
| **8** | **OK** |
| **9** | **EX-CAD hallucination:** `EX-CAD-[PHONE#…]` — correct **`EX-CAD-800439`**. |
| **10** | **Overbroad:** “**Full CCTV footage**” — text = **partial** + **continuity draft/unsigned**; tie gaps to **MG6 + notes**. Could mention **OCR/index** hook **only** as flagged. |

---

## NS-CPS-2026-0440 — run logged (user paste)

**Source tested:** User-provided bundle (**ALEX MORLEY**, **EMMA FLETCHER**, hook **Late email, forgot attachment**, **Mixed counts: theft + blade + POA**, **PTPH**).

**Questions:** Core Q1–10 (full batch pasted).

### Failures observed (CaseBrain vs bundle text)

| Q | Issue |
|---|--------|
| **1** | **Awaiting incomplete:** Missing **CCTV** → **continuity statement / engineer note**; missing **Forensics / medical** → **lab report / GP records**. |
| **2** | **OK** |
| **3** | **Incomplete:** Hook in **MG5** *and* **MG6** (tension). Answer said **MG5 only**. **Flagged** only — OK. |
| **4** | **Wrong:** Charge is **three** limbs; MG5 gives **one** generic allegation line + **push/punch** boilerplate — does **not** spell out **separate** facts per count; should say so. |
| **5** | **OK** |
| **6** | **OK** |
| **7** | **Wrong:** **No comment** on **certain technical** matters — not “leaving matters open.” Include **alternative explanation** branch. |
| **8** | **OK** |
| **9** | **EX-CAD hallucination:** `EX-CAD-[PHONE#…]` — correct **`EX-CAD-800440`**. |
| **10** | **Overbroad:** “**Full CCTV**” — text = **partial** + **continuity** issues; name **three count types** without adding facts not in bundle. |

---

*Last updated: NS-CPS-2026-0435 user-paste run added — golden 10 complete.*
