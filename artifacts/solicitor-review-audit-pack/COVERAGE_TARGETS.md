# Coverage Targets — Solicitor-Reviewed Audit

> **Do not pad the audit with easy or repetitive bundles.**  
> **Solicitor-reviewed audit has not yet run.**  
> **Controlled/synthetic audit (253 cases) already covers fictional traps — this layer needs meaningful independent variation.**

---

## Why diversity matters

Hitting “30 cases” with the same fact pattern and renamed defendants would **not** prove real-world readiness. Each reviewed bundle should add **meaningful** variation across offence, evidence, traps, and layout.

Reviewers must **flag** bundles that feel substantially duplicated.

---

## Target offence families

Aim for spread across the pilot (30–50) and later stages — **not** 30 identical PWITS files.

| Family | Examples |
|--------|----------|
| Drugs / PWITS | Possession, intent, street dealing |
| Conspiracy | Multi-handed supply, telecoms |
| County lines | Runner/holder, vulnerability |
| Encro / encrypted comms | Handle attribution, partial exports |
| Violence / GBH | Injury, intent, joint enterprise |
| Multi-handed assault | Presence vs participation |
| Robbery / CCTV | ID procedure, stills vs master |
| Domestic / harassment / coercive control | Course of conduct, messages |
| Sexual / ABE / historic | First account, referred ABE |
| Motoring / SJP | Procedure, calibration, thin bundle |
| Fraud / dishonesty | Account control, schedules |
| Weapons / public order | Search, classification |
| Breach orders | Service, terms |
| Youth / vulnerability | AA, custody, safeguards |

---

## Target evidence types

Each bundle should touch several; no bundle needs all.

- MG5, MG11  
- MG6C / MG6D / unused schedules  
- BWV, CCTV  
- Custody / PACE  
- Interview recording / transcript  
- Phone screenshots vs full download / extraction  
- Encro handles / chat logs  
- Cellsite / subscriber  
- Forensic / medical  
- ID / VIPER  
- Exhibits / indexes  
- Disclosure schedules  

---

## Evidence-state traps (must appear across the set)

| Trap | Example |
|------|---------|
| Served but unreliable | Unsigned MG11, OCR garble |
| referred_only | MG6 line, index-only BWV |
| missing | Full custody, lab, VIPER |
| incomplete | Clip, stills, screenshots, summary |
| not_safely_confirmed | Ambiguous index entries |
| inferred_only | MG5 attribution without source |
| other_defendant_only | Co-def chat / interview |
| Partial vs full export | BWV/CCTV/phone |
| Index-listed but absent | “On file” with no file |
| Screenshots vs download | Digital attribution |
| Custody extract vs full record | PACE |
| CCTV stills vs master | Robbery/PO |
| Co-defendant evidence | Segregation |
| Changed / corrected charge | Old pages on bundle |
| Source hierarchy conflict | MG5 vs MG11 |
| Date/time conflict | Statement vs custody vs CAD |
| Youth safeguard gap | AA record missing |
| Disclosure schedule trap | Vague MG6C |
| Wrong modality risk | Fraud language on assault file |

---

## PDF / layout traps (across the set)

| Layout | Risk |
|--------|------|
| Poor OCR | Misread labels, names |
| Scanned image-only | No selectable text |
| Rotated pages | Wrong reading order |
| Duplicated pages | False confidence |
| Out-of-order pages | Timeline errors |
| Index-only bundle | Everything referred |
| Missing attachments | Broken links |
| Late disclosure addendum | Version confusion |
| Corrected / replaced charge | Old offence bleed |
| Mixed defendants | Wrong-person bleed |
| Huge bundle | Missed gaps |
| Thin bundle | Over-inference |

---

## Duplicate / diversity rules

1. **No near-duplicate bundles** to hit numbers — if two cases feel the same, **flag** and replace one.  
2. **Avoid** same fact pattern with only names/dates changed.  
3. **Avoid** same chase list copy-pasted across cases without bundle support.  
4. Each case should vary **at least three** of: offence family, evidence type, trap, layout, complexity, disclosure gap.  
5. Reviewer signs **duplicate check** on `REVIEW_FORM.md`.  
6. CaseBrain team runs diversity review before counting toward milestones.

---

## Suggested pilot mix (30–50 cases)

| Band | Count (guide) | Notes |
|------|---------------|-------|
| Thin / SJP / motoring | 4–6 | Procedure-focused |
| Violence / domestic | 6–8 | MG11, BWV, injury |
| Drugs / county lines / Encro | 8–10 | Digital attribution |
| Robbery / CCTV | 4–6 | ID, stills |
| Fraud / dishonesty | 4–6 | Schedules, accounts |
| Sexual / ABE / youth | 4–6 | Safeguards, sensitivity |
| Multi-def / conspiracy | 4–6 | Co-def segregation |
| Messy layout (OCR/rotated/huge) | 6–8 | Cross-cutting |

Totals overlap — layout traps should appear **inside** offence bands.

---

## What not to do

- 30 PWITS phone cases with different defendant names  
- Only “clean” native PDFs  
- Only huge Crown Court bundles  
- Skip co-defendant, youth, or sexual sensitivity entirely  
- Inflate counts with controlled simulator re-runs **without** independent solicitor keys  

---

## Disclaimer

Controlled CaseBrain audit already ran on **253 fictional/anonymised** cases with **0 false-served**. Solicitor-reviewed audit is **independent** and **not yet started**. Coverage targets here apply **only** to the solicitor layer.
