# Fictional case eval — backlog & bundle fixes (living doc)

Update this as you finish each PDF run. After all 40, apply **product/prompt** items once; apply **per-ref bundle** edits in batch.

---

## A. Product / CaseBrain behaviour (global — from runs so far)

| # | Issue | Fix direction |
|---|--------|----------------|
| 1 | **Off-document disclosure lists** (e.g. fire report, footwear, custody CCTV, “CCTV full window”) not on MG6 | Hard rule: outstanding items = **only** MG6 rows + named **EX-** for **this** upload. Refuse or say “not in schedule.” |
| 2 | **“Offence unknown”** when charge extract exists in PDF | Don’t use snapshot if it contradicts uploaded bundle; or merge snapshot + bundle with explicit priority: **bundle wins** for charge line. |
| 3 | **MG11 status wrong** (e.g. “draft” vs “signed”) | Ground answers in **MG11 status line** in the PDF. |
| 4 | **Exhibits** — vague “EX- style” instead of listing refs | Require verbatim **EX-…** from exhibit list only. |
| 5 | **999 flattened** — “served yes” while text also says extract vs master | Flag **internal tension**; don’t collapse to one word. |
| 6 | **Risk/strategy** — generic actus reus / mental state essays | Tie to **this** charge + **hooks** in bundle; no crime-template menus. |
| 7 | **Chase letters** — invented categories | Chase = **schedule rows only** for that file. |
| 8 | **Template noise in MG5** (e.g. push/punch in fraud bundles) | **Bundle fix:** offence-specific MG5 body per ref in generator v2. |
| 9 | **Long Q&A lists truncate** (only ~6–7 answers per reply in practice) | **Eval workflow:** ask **5 questions per message** (or split 10 into two pastes). **Product (optional):** warn when pasting >N questions; chunk prompts; raise output token limit for “answer all” if needed. |

---

## A1. PDFs we asked questions on — problems & what to fix

Refs **0431, 0432, 0433, 0434, 0436, 0437, 0438**. This is the rollup of what went wrong in answers and what to change in **bundle text** vs **product/prompts** (see §A).

| Ref | Hook | Problems seen in answers | Strengthen in bundle / eval |
|-----|------|--------------------------|-----------------------------|
| **0431** | Theft / snatch; victim timeline slip | Mostly OK; small risk of inventing times or loose continuity on 999/CCTV | Tighten **continuity** wording if tables are messy; don’t imply exact times unless printed |
| **0432** | ABH domestic; “medical schedule only” | **Q5-style fail:** invented disclosure (fire, footwear, custody CCTV), “offence unknown” despite charge — **hallucination / template bleed** | Make **MG5 injury vs MG6 medical-only** explicit and testable; optional clearer GP vs hospital line |
| **0433** | Offensive weapon (non-blade); work tool | Wrong **MG11** (draft vs signed), wrong **exhibits**, invented chase list, snapshot bleed; Q9 contradiction handling was OK | Single **MG11** status everywhere; exhibits only **EX-CCTV-83**, **EX-999-TXT**, **EX-CAD-800433**, **EX-MG6-EMAIL**; align **999** row; offence-specific MG5; fix **WRIGHT2** if typo |
| **0434** | Fraud retail; **MG5 £ vs MG11 £** | Bundle **did not print two £ figures** — model must say “not stated” or bundle must add numbers; weak on amounts/exhibits | **Add two explicit £ amounts** + reconciliation line; fix **NEIL MITCHELL2** → **NEIL MITCHELL** if typo; re-run Q3/Q9 after edit |
| **0436** | Drug driving; metadata optional | **999** as “full” vs extract/master awaited; **MG11** signed vs “possibly draft”; interview “not detailed” though summary exists; **assault + possession** boilerplate in MG5 — wrong offence | Strip wrong-offence MG5 boilerplate; **drug-driving** narrative; align **999** (extract vs master); **ZARA WRIGHT2** → **WRIGHT** if typo; optional **CASEBRAIN JSON** for metadata hook |
| **0437** | Burglary dwell + s.47; multi-victim muddled | **Exhibits** wrong in answers (EX-1…5 vs **EX-CCTV-87** etc.); generic risk; **truncate** mid-answer; push/punch boilerplate ill-fitting | **Two named victims** or clear order/count; **burglary-specific** MG5; align **MG11** draft vs schedule; correct exhibit refs in source |
| **0438** | Handling stolen goods; **third party Carl** | **Carl** only attributed to MG5 (missed **MG6** tension note); **999 vs CCTV** blended; **interview** drift (invented intent/recklessness vs “no comment” + request full CCTV/999 scope); **exhibits** hallucinated **EX-001…5** instead of **EX-CCTV-88**, **EX-999-TXT**, **EX-CAD-800438**, **EX-MG6-EMAIL**; client summary **generic actus reus / mens rea** | **Offence-specific** MG5 (drop push/punch boilerplate); keep **Carl** in MG5 **and** MG6 so both locations are testable; **DECLAN REES2** → **REES** if typo; align index “final” language vs draft MG11 if confusing |

**Global (all runs):** grounding only from **this** PDF’s MG5/MG6/MG11/charge/exhibits; **no** generic missing-disclosure menus; **bundle wins** over snapshot for charge; verbatim **EX-…** labels; don’t flatten **999** tension; **5 questions per message** if long lists truncate (~6–7 answers per reply).

---

## B. Per-PDF bundle content fixes (queue)

| Ref | Title / hook | Bundle change |
|-----|----------------|---------------|
| **0432** | ABH domestic / “medical schedule only” | (Optional) Explicit GP vs hospital line; ensure MG5 injury wording vs MG6 **medical schedule only** is testable. |
| **0433** | Offensive weapon (non-blade) / work tool | Align **MG11 signed vs draft** everywhere; fix **999** row if table contradicts CCTV/999 narrative; ensure exhibits only **EX-CCTV-83**, **EX-999-TXT**, **EX-CAD-800433**, **EX-MG6-EMAIL**; remove template “push/punch” in MG5 if still present. |
| **0434** | Fraud retail refund / **MG5 £ vs MG11 £** | **Add two explicit £ amounts** in body (MG5 vs MG11) + optional third in annex; short **CPS reconciliation email** line; fix **NEIL MITCHELL2** → **NEIL MITCHELL** if typo; ensure Q3/Q9 are testable with real numbers. |
| **0436** | Drug driving / metadata optional | Remove **assault** + **possession/supply** boilerplate from MG5; **drug-driving** specific lines; align **999** (extract vs master) with MG5 “tidy”; **ZARA WRIGHT2** → **WRIGHT** if typo; add optional **CASEBRAIN JSON** if hook is metadata. |
| **0437** | Burglary dwell + s.47 / **multi-victim order muddled** | Add **two named victims** or **count/order** in MG5/MG6 so “muddled” is testable; align MG11 draft vs schedule; **burglary-specific** MG5 (not generic punch/push unless ABH fact); exhibits **EX-CCTV-87** … |
| **0438** | Handling stolen goods / **third party Carl** | Replace generic **push/punch** MG5 defence line with **handling**-specific dispute wording; ensure **Carl** appears in **MG5** and **MG6** consistently; optional: resolve **REES2** naming; clarify index vs MG11 if “final” vs **draft** confuses eval |

---

## C. Case **NS-CPS-2026-0434** — eval snapshot (saved)

**Questions used:** 10-question battery (served/outstanding, MG5 vs MG6, £ hook, charge, interview, chase, risk, exhibits, contradiction, client-safe).

**CaseBrain issues observed:** invented completeness on amounts without figures; snapshot bleed (“unknown offence”, stance); weak on **exact exhibits**.

**Model answer principle:** If PDF **names** MG5 £ vs MG11 £ but **does not print figures**, answer must say **figures not stated** and still explain **consequence** (credibility, quantum, indictment basis) at principle level.

**After bundle edit:** Re-run Q3/Q9 once **£X vs £Y** are in the text.

---

## D. Next steps

1. Continue **next PDF** with same **10-question template** (adjust hooks per ref).  
2. Append new rows to **§B** and short notes to **§C** per ref.  
3. After **40**: one pass on **§A** (product), one pass on **§B** (`.txt` sources / regenerate PDFs if needed).

---

*Last updated: NS-CPS-2026-0438 eval merged (§A1, §B, §C1).*
