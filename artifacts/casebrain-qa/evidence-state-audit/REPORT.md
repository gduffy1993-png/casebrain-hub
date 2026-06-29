# Evidence-State Accuracy Audit — controlled harness report

> **Controlled audit harness run — not solicitor-reviewed real-world audit.**

- Generated: 2026-06-29T16:50:52.360Z
- Harness: evidence-state-audit-v1
- Fixtures: proof-pack-01, sim-038, sim-039, sim-040, sim-041, sim-042, sim-043, sim-044, sim-045, sim-046, sim-047, sim-048, sim-049, sim-050, sim-051, sim-052, sim-053, sim-054, sim-055, sim-056, sim-057, sim-058, sim-059, sim-060, sim-061, sim-062, sim-063, sim-066, sim-067, sim-069, sim-076, sim-077, sim-078, sim-079, sim-080, sim-081, sim-082, sim-083, sim-084, sim-085, sim-086, sim-087, sim-088, sim-089, sim-090, sim-091, sim-092, sim-093, sim-094, sim-095, sim-096, sim-097, sim-098, sim-099, sim-100, sim-101, sim-102, sim-103, sim-104, sim-105

## Summary

| Metric | Value |
|--------|-------|
| Total cases | 60 |
| Total evidence items | 471 |
| Matched items | 395 |
| Unmatched items | 76 |
| False-served count | 0 |
| False-served rate | 0.0% |
| Referred-only accuracy | 98.9% |
| Missing accuracy | 98.5% |
| Incomplete accuracy | 80.2% |
| Not-safely-confirmed accuracy | 1.3% |
| Unsafe reliance count | 0 |
| Unsafe reliance rate | 0.0% |
| Wrong-defendant bleed count | 0 |
| Wrong-defendant bleed rate | 0.0% |
| Chase accuracy | 84.7% |
| Over-cautious rate | 0.2% |
| Blocking failures | 0 |
| Warnings | 76 |

### Chase mapping breakdown

- Expected chase items (all cases): 453
- Matched via label/family mapping: 388
- Unmatched — no chase candidate on surface: 65
- Unmatched — surfaced but wrong/missing family: 0

## Blocking failures

_None detected on this controlled run._

## Warnings

- **unmatched_truth_item** (proof-pack-01 · Complainant MG11 (signed)): No CaseBrain prediction matched truth item "Complainant MG11 (signed)"
- **unmatched_truth_item** (proof-pack-01 · Exhibit / bundle index): No CaseBrain prediction matched truth item "Exhibit / bundle index"
- **unmatched_truth_item** (proof-pack-01 · Phone screenshots (partial)): No CaseBrain prediction matched truth item "Phone screenshots (partial)"
- **unmatched_truth_item** (proof-pack-01 · Custody / PACE record): No CaseBrain prediction matched truth item "Custody / PACE record"
- **unmatched_truth_item** (proof-pack-01 · MG5 attribution inference): No CaseBrain prediction matched truth item "MG5 attribution inference"
- **unmatched_truth_item** (proof-pack-01 · Co-defendant Lee Marsh interview): No CaseBrain prediction matched truth item "Co-defendant Lee Marsh interview"
- **unmatched_truth_item** (sim-038 · whether the handle is personal, shared, or inferred from contact names): No CaseBrain prediction matched truth item "whether the handle is personal, shared, or inferred from contact names"
- **unmatched_truth_item** (sim-040 · whether the defendant controlled the line or was merely present): No CaseBrain prediction matched truth item "whether the defendant controlled the line or was merely present"
- **unmatched_truth_item** (sim-041 · whether exploitation is evidenced or only mentioned): No CaseBrain prediction matched truth item "whether exploitation is evidenced or only mentioned"
- **unmatched_truth_item** (sim-042 · which exhibits relate to Omar rather than co-defendants): No CaseBrain prediction matched truth item "which exhibits relate to Omar rather than co-defendants"
- **unmatched_truth_item** (sim-043 · MG5): No CaseBrain prediction matched truth item "MG5"
- **unmatched_truth_item** (sim-043 · analyst summary): No CaseBrain prediction matched truth item "analyst summary"
- **unmatched_truth_item** (sim-043 · one call schedule extract): No CaseBrain prediction matched truth item "one call schedule extract"
- **unmatched_truth_item** (sim-043 · whether contact frequency proves supply or ordinary association): No CaseBrain prediction matched truth item "whether contact frequency proves supply or ordinary association"
- **unmatched_truth_item** (sim-044 · whether Imran struck anyone or was merely present): No CaseBrain prediction matched truth item "whether Imran struck anyone or was merely present"
- **unmatched_truth_item** (sim-045 · whether Leah encouraged, assisted, withdrew, or was present only): No CaseBrain prediction matched truth item "whether Leah encouraged, assisted, withdrew, or was present only"
- **unmatched_truth_item** (sim-049 · whether third-party records have been obtained, reviewed, or withheld): No CaseBrain prediction matched truth item "whether third-party records have been obtained, reviewed, or withheld"
- **unmatched_truth_item** (sim-050 · whether messages are complete, attributed, or taken out of context): No CaseBrain prediction matched truth item "whether messages are complete, attributed, or taken out of context"
- **unmatched_truth_item** (sim-051 · whether files were viewed, stored, cached, or attributable to the defendant): No CaseBrain prediction matched truth item "whether files were viewed, stored, cached, or attributable to the defendant"
- **unmatched_truth_item** (sim-052 · whether injuries meet ABH threshold): No CaseBrain prediction matched truth item "whether injuries meet ABH threshold"
- **unmatched_truth_item** (sim-053 · whether specific intent can be supported on the served papers): No CaseBrain prediction matched truth item "whether specific intent can be supported on the served papers"
- **unmatched_truth_item** (sim-054 · MG5): No CaseBrain prediction matched truth item "MG5"
- **unmatched_truth_item** (sim-054 · two civilian statements): No CaseBrain prediction matched truth item "two civilian statements"
- **unmatched_truth_item** (sim-054 · police arrest summary): No CaseBrain prediction matched truth item "police arrest summary"
- **unmatched_truth_item** (sim-054 · whether Sasha used or threatened violence): No CaseBrain prediction matched truth item "whether Sasha used or threatened violence"
- **unmatched_truth_item** (sim-055 · sequence before arrest and defendant condition): No CaseBrain prediction matched truth item "sequence before arrest and defendant condition"
- **unmatched_truth_item** (sim-057 · whether item is the stolen property and whether Aimee knew): No CaseBrain prediction matched truth item "whether item is the stolen property and whether Aimee knew"
- **unmatched_truth_item** (sim-058 · whether possession was for theft or innocent work/use): No CaseBrain prediction matched truth item "whether possession was for theft or innocent work/use"
- **unmatched_truth_item** (sim-059 · MG5): No CaseBrain prediction matched truth item "MG5"
- **unmatched_truth_item** (sim-059 · breath result summary): No CaseBrain prediction matched truth item "breath result summary"
- **served_item_not_surfaced_in_h5** (sim-059 · charge sheet): Served item "charge sheet" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- **unmatched_truth_item** (sim-059 · whether procedure and device checks are proved): No CaseBrain prediction matched truth item "whether procedure and device checks are proved"
- **unmatched_truth_item** (sim-060 · MG5): No CaseBrain prediction matched truth item "MG5"
- **unmatched_truth_item** (sim-060 · custody extract): No CaseBrain prediction matched truth item "custody extract"
- **served_item_not_surfaced_in_h5** (sim-060 · charge sheet): Served item "charge sheet" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- **unmatched_truth_item** (sim-060 · whether sample chain and result are admissibly proved): No CaseBrain prediction matched truth item "whether sample chain and result are admissibly proved"
- **unmatched_truth_item** (sim-061 · whether refusal/warning/reasonable excuse is properly evidenced): No CaseBrain prediction matched truth item "whether refusal/warning/reasonable excuse is properly evidenced"
- **unmatched_truth_item** (sim-062 · SJP notice): No CaseBrain prediction matched truth item "SJP notice"
- **unmatched_truth_item** (sim-062 · vehicle keeper record): No CaseBrain prediction matched truth item "vehicle keeper record"
- **unmatched_truth_item** (sim-062 · insurance database printout): No CaseBrain prediction matched truth item "insurance database printout"
- **unmatched_truth_item** (sim-062 · whether Meera was the driver and whether insurance status is correctly evidenced): No CaseBrain prediction matched truth item "whether Meera was the driver and whether insurance status is correctly evidenced"
- **unmatched_truth_item** (sim-063 · knowledge, dishonesty, and calculation basis): No CaseBrain prediction matched truth item "knowledge, dishonesty, and calculation basis"
- **unmatched_truth_item** (sim-066 · MG5): No CaseBrain prediction matched truth item "MG5"
- **served_item_not_surfaced_in_h5** (sim-066 · charge sheet): Served item "charge sheet" has ledger/source anchor in H5 output but no dedicated chase row (chase-first product)
- **unmatched_truth_item** (sim-066 · email exhibit summary): No CaseBrain prediction matched truth item "email exhibit summary"
- **unmatched_truth_item** (sim-066 · intent to pervert justice versus administrative/document confusion): No CaseBrain prediction matched truth item "intent to pervert justice versus administrative/document confusion"
- **unmatched_truth_item** (sim-067 · public place, possession, and reasonable excuse): No CaseBrain prediction matched truth item "public place, possession, and reasonable excuse"
- **unmatched_truth_item** (sim-069 · pattern, attribution, and context): No CaseBrain prediction matched truth item "pattern, attribution, and context"
- **unmatched_truth_item** (sim-076 · shared thread messages): No CaseBrain prediction matched truth item "shared thread messages"
- **unmatched_truth_item** (sim-078 · mixed defendant message excerpts): No CaseBrain prediction matched truth item "mixed defendant message excerpts"
- … and 26 more (see report.json)

## Per-case breakdown

### proof-pack-01 — Proof Pack 01 — mixed evidence states (fictional)

- Items: 7 · matched 1 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Complainant MG11 (signed) | served | — | no | no_prediction_match |
| Exhibit / bundle index | served | — | no | no_prediction_match |
| Phone screenshots (partial) | incomplete | — | no | no_prediction_match |
| Body-worn video | referred_only | missing | yes | — |
| Custody / PACE record | missing | — | no | no_prediction_match |
| MG5 attribution inference | inferred_only | — | no | no_prediction_match |
| Co-defendant Lee Marsh interview | other_defendant_only | — | no | no_prediction_match |

### sim-038 — EncroChat handle attribution disputed with co-defendant bleed risk

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 summary | served | served | yes | — |
| schedule of alleged Encro handles | served | served | yes | — |
| two MG11 officer statements | served | served | yes | — |
| full extraction report | referred_only | missing | yes | — |
| handle attribution report | referred_only | missing | yes | — |
| co-defendant chat export | other_defendant_only | other_defendant_only | yes | — |
| device attribution evidence | missing | missing | yes | — |
| download continuity | missing | missing | yes | — |
| cellsite linking defendant to device | missing | missing | yes | — |
| expert methodology | missing | missing | yes | — |
| whether the handle is personal, shared, or inferred from contact names | inferred_only | — | no | no_prediction_match |

### sim-039 — EncroChat extraction continuity and cropped-message trap

- Items: 11 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| cropped message screenshots | incomplete | incomplete | yes | — |
| officer exhibit list | served | incomplete | no | — |
| full extraction | referred_only | missing | yes | — |
| hash values | referred_only | missing | yes | — |
| translation/interpretation note | referred_only | missing | yes | — |
| complete conversation thread | missing | missing | yes | — |
| metadata | missing | missing | yes | — |
| export audit trail | missing | missing | yes | — |
| exhibit continuity statement | missing | missing | yes | — |
| whether screenshots are complete, edited, or selected | not_safely_confirmed | incomplete | no | — |

### sim-040 — County lines cellsite and travel gaps

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| arrest circumstances | served | served | yes | — |
| drug seizure statement | served | served | yes | — |
| cellsite schedule | referred_only | missing | yes | — |
| phone download | referred_only | missing | yes | — |
| line attribution note | referred_only | missing | yes | — |
| cellsite map | missing | missing | yes | — |
| train/bus ticket evidence | missing | missing | yes | — |
| full phone extraction | missing | missing | yes | — |
| county line call data | missing | missing | yes | — |
| whether the defendant controlled the line or was merely present | not_safely_confirmed | — | no | no_prediction_match |

### sim-041 — County lines vulnerability and modern slavery marker

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| custody summary | served | served | yes | — |
| drug expert statement | served | served | yes | — |
| NRM referral | referred_only | missing | yes | — |
| youth offending team note | referred_only | missing | yes | — |
| social care record | referred_only | missing | yes | — |
| NRM referral outcome | missing | missing | yes | — |
| appropriate adult notes | missing | missing | yes | — |
| safeguarding chronology | missing | missing | yes | — |
| phone attribution | missing | missing | yes | — |
| whether exploitation is evidenced or only mentioned | not_safely_confirmed | — | no | no_prediction_match |

### sim-042 — Multi-defendant drug conspiracy per-defendant evidence map

- Items: 12 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| indictment draft | served | incomplete | no | — |
| selected surveillance log | served | incomplete | no | — |
| co-defendant interview summary | other_defendant_only | other_defendant_only | yes | — |
| full surveillance schedule | referred_only | missing | yes | — |
| telecoms attribution | referred_only | missing | yes | — |
| banking schedule | referred_only | missing | yes | — |
| per-defendant evidence matrix | missing | missing | yes | — |
| full telecoms schedule | missing | missing | yes | — |
| unused material schedule | missing | missing | yes | — |
| surveillance continuity | missing | missing | yes | — |
| which exhibits relate to Omar rather than co-defendants | not_safely_confirmed | — | no | no_prediction_match |

### sim-043 — Drug conspiracy telecoms download missing but summary confident

- Items: 11 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | — | no | no_prediction_match |
| analyst summary | served | — | no | no_prediction_match |
| one call schedule extract | served | — | no | no_prediction_match |
| full call data | referred_only | missing | yes | — |
| download report | referred_only | missing | yes | — |
| cellsite analysis | referred_only | missing | yes | — |
| raw call data | missing | missing | yes | — |
| download search terms | missing | missing | yes | — |
| cellsite maps | missing | missing | yes | — |
| analyst working notes | missing | missing | yes | — |
| whether contact frequency proves supply or ordinary association | not_safely_confirmed | — | no | no_prediction_match |

### sim-044 — Multi-handed assault presence versus participation

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| complainant MG11 | served | served | yes | — |
| arresting officer MG11 | served | served | yes | — |
| CCTV | referred_only | referred_only | yes | — |
| body-worn video | referred_only | referred_only | yes | — |
| medical photographs | referred_only | missing | yes | — |
| full CCTV export | missing | missing | yes | — |
| BWV | missing | missing | yes | — |
| medical notes | missing | missing | yes | — |
| scene timeline | missing | missing | yes | — |
| whether Imran struck anyone or was merely present | inferred_only | — | no | no_prediction_match |

### sim-045 — Joint-enterprise violence with partial BWV

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| victim statement | served | served | yes | — |
| short BWV clip transcript | incomplete | incomplete | yes | — |
| full BWV export | referred_only | missing | yes | — |
| CCTV | referred_only | missing | yes | — |
| medical report | referred_only | missing | yes | — |
| complete BWV | missing | missing | yes | — |
| CCTV | missing | missing | yes | — |
| medical report | missing | missing | yes | — |
| co-defendant interview records | other_defendant_only | other_defendant_only | yes | — |
| whether Leah encouraged, assisted, withdrew, or was present only | inferred_only | — | no | no_prediction_match |

### sim-046 — Robbery CCTV stills only and poor-quality identification

- Items: 11 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| complainant MG11 | served | served | yes | — |
| CCTV stills | incomplete | incomplete | yes | — |
| full CCTV | referred_only | missing | yes | — |
| CCTV continuity statement | referred_only | missing | yes | — |
| ID procedure record | referred_only | missing | yes | — |
| full CCTV export | missing | missing | yes | — |
| image-quality note | missing | missing | yes | — |
| ID procedure record | missing | missing | yes | — |
| time-window footage | missing | missing | yes | — |
| whether stills fairly represent the footage | not_safely_confirmed | incomplete | no | — |

### sim-047 — Robbery full time-window CCTV missing

- Items: 11 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| short CCTV clip description | served | incomplete | no | — |
| victim statement | served | served | yes | — |
| full premises CCTV | referred_only | missing | yes | — |
| street CCTV | referred_only | missing | yes | — |
| CAD/999 call | referred_only | missing | yes | — |
| full CCTV time-window | missing | missing | yes | — |
| approach/departure footage | missing | missing | yes | — |
| continuity logs | missing | missing | yes | — |
| 999 audio | missing | provisional | yes | — |
| whether wider footage undermines identification or timing | not_safely_confirmed | incomplete | no | — |

### sim-048 — Historic sexual allegation with ABE referred only and delay issue

- Items: 11 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| complainant MG11 summary | served | served | yes | — |
| charge sheet | served | served | yes | — |
| ABE interview | referred_only | missing | yes | — |
| first complaint record | referred_only | missing | yes | — |
| school/social records | referred_only | missing | yes | — |
| ABE video/transcript | missing | missing | yes | — |
| first account material | missing | missing | yes | — |
| third-party records schedule | missing | missing | yes | — |
| disclosure officer note | missing | missing | yes | — |
| whether delay/context material is served or only mentioned | not_safely_confirmed | incomplete | no | — |

### sim-049 — Historic sexual third-party records mentioned but absent

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| police disclosure summary | served | served | yes | — |
| complainant statement | served | served | yes | — |
| counselling records | referred_only | missing | yes | — |
| school records | referred_only | missing | yes | — |
| GP records | referred_only | missing | yes | — |
| third-party record schedule | missing | missing | yes | — |
| disclosure decision log | missing | missing | yes | — |
| applications/correspondence | missing | missing | yes | — |
| ABE transcript | missing | missing | yes | — |
| whether third-party records have been obtained, reviewed, or withheld | not_safely_confirmed | — | no | no_prediction_match |

### sim-050 — Phone download screenshots only with missing scope and metadata

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| complainant screenshots | incomplete | incomplete | yes | — |
| short officer statement | served | served | yes | — |
| phone download | referred_only | missing | yes | — |
| exhibit metadata | referred_only | missing | yes | — |
| device audit log | referred_only | missing | yes | — |
| full phone download | missing | missing | yes | — |
| search terms/scope | missing | missing | yes | — |
| metadata | missing | missing | yes | — |
| device ownership/continuity | missing | missing | yes | — |
| whether messages are complete, attributed, or taken out of context | not_safely_confirmed | — | no | no_prediction_match |

### sim-051 — Phone extraction continuity and search terms unclear

- Items: 12 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| digital summary table | served | served | yes | — |
| seizure statement | served | served | yes | — |
| full extraction report | referred_only | missing | yes | — |
| forensic image hash | referred_only | missing | yes | — |
| search terms | referred_only | missing | yes | — |
| full extraction report | missing | missing | yes | — |
| hash values | missing | missing | yes | — |
| forensic methodology | missing | missing | yes | — |
| search scope | missing | missing | yes | — |
| device-user attribution | missing | missing | yes | — |
| whether files were viewed, stored, cached, or attributable to the defendant | not_safely_confirmed | — | no | no_prediction_match |

### sim-052 — ABH medical evidence referred only

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| complainant statement | served | served | yes | — |
| photos index | served | served | yes | — |
| medical notes | referred_only | missing | yes | — |
| injury photographs | referred_only | missing | yes | — |
| doctor statement | referred_only | missing | yes | — |
| medical records | missing | missing | yes | — |
| photographs | missing | missing | yes | — |
| doctor statement | missing | missing | yes | — |
| injury continuity | missing | missing | yes | — |
| whether injuries meet ABH threshold | not_safely_confirmed | — | no | no_prediction_match |

### sim-053 — Section 18 versus section 20 intent trap

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| victim MG11 | served | served | yes | — |
| charge sheet | served | served | yes | — |
| medical report | referred_only | missing | yes | — |
| CCTV | referred_only | missing | yes | — |
| 999 call | referred_only | missing | yes | — |
| medical report | missing | missing | yes | — |
| CCTV | missing | missing | yes | — |
| intent-specific evidence | missing | missing | yes | — |
| weapon/source continuity | missing | missing | yes | — |
| whether specific intent can be supported on the served papers | not_safely_confirmed | — | no | no_prediction_match |

### sim-054 — Affray or violent disorder mixed participants

- Items: 11 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | — | no | no_prediction_match |
| two civilian statements | served | — | no | no_prediction_match |
| police arrest summary | served | — | no | no_prediction_match |
| CCTV | referred_only | provisional | yes | — |
| BWV | referred_only | provisional | yes | — |
| scene plan | referred_only | missing | yes | — |
| CCTV/BWV | missing | missing | yes | — |
| participant timeline | missing | missing | yes | — |
| scene plan | missing | missing | yes | — |
| identification schedule | missing | missing | yes | — |
| whether Sasha used or threatened violence | inferred_only | — | no | no_prediction_match |

### sim-055 — Police contact public order with BWV and custody sequence gaps

- Items: 12 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| officer MG11 | served | served | yes | — |
| custody summary extract | served | incomplete | no | — |
| BWV | referred_only | provisional | yes | — |
| full custody record | referred_only | missing | yes | — |
| PACE interview recording | referred_only | missing | yes | — |
| BWV export | missing | missing | yes | — |
| full custody record | missing | missing | yes | — |
| risk assessment | missing | missing | yes | — |
| interview recording | missing | provisional | yes | — |
| use-of-force record | missing | missing | yes | — |
| sequence before arrest and defendant condition | not_safely_confirmed | — | no | no_prediction_match |

### sim-056 — Burglary forensic fingerprint referred only

- Items: 11 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| victim statement | served | served | yes | — |
| scene officer statement | served | served | yes | — |
| fingerprint report | referred_only | missing | yes | — |
| forensic continuity | referred_only | missing | yes | — |
| CCTV | referred_only | provisional | yes | — |
| fingerprint report | missing | missing | yes | — |
| continuity records | missing | missing | yes | — |
| scene photographs | missing | missing | yes | — |
| CCTV | missing | provisional | yes | — |
| whether any forensic evidence links Harvey to entry or only presence | not_safely_confirmed | incomplete | no | — |

### sim-057 — Handling stolen goods property continuity gap

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| owner statement | served | served | yes | — |
| seizure note | served | served | yes | — |
| property register | referred_only | missing | yes | — |
| CCTV | referred_only | missing | yes | — |
| forensic report | referred_only | missing | yes | — |
| property continuity log | missing | missing | yes | — |
| CCTV | missing | missing | yes | — |
| valuation/proof of theft | missing | missing | yes | — |
| knowledge evidence | missing | missing | yes | — |
| whether item is the stolen property and whether Aimee knew | not_safely_confirmed | — | no | no_prediction_match |

### sim-058 — Going equipped tool possession and lawful purpose trap

- Items: 12 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| seizure statement | served | served | yes | — |
| charge sheet | served | served | yes | — |
| BWV | referred_only | missing | yes | — |
| CCTV | referred_only | provisional | yes | — |
| tool photographs | referred_only | missing | yes | — |
| BWV | missing | missing | yes | — |
| CCTV | missing | provisional | yes | — |
| tool photographs | referred_only | missing | yes | — |
| interview record | missing | provisional | yes | — |
| lawful-purpose context | missing | missing | yes | — |
| whether possession was for theft or innocent work/use | inferred_only | — | no | no_prediction_match |

### sim-059 — Drink driving intoxilyzer calibration missing

- Items: 11 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | — | no | no_prediction_match |
| breath result summary | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| MGDD procedure form | referred_only | missing | yes | — |
| device calibration/check record | referred_only | missing | yes | — |
| custody record | referred_only | provisional | yes | — |
| MGDD form | missing | missing | yes | — |
| calibration/check record | missing | missing | yes | — |
| custody/PACE record | missing | missing | yes | — |
| officer statement | missing | missing | yes | — |
| whether procedure and device checks are proved | not_safely_confirmed | — | no | no_prediction_match |

### sim-060 — Drug driving lab and toxicology chain missing

- Items: 11 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | — | no | no_prediction_match |
| custody extract | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| toxicology certificate | referred_only | missing | yes | — |
| blood continuity | referred_only | missing | yes | — |
| MGDD procedure form | referred_only | missing | yes | — |
| toxicology certificate | missing | missing | yes | — |
| sample continuity | missing | missing | yes | — |
| MGDD form | missing | missing | yes | — |
| lab method/accreditation | missing | missing | yes | — |
| whether sample chain and result are admissibly proved | not_safely_confirmed | — | no | no_prediction_match |

### sim-061 — Failure to provide specimen procedure and BWV gaps

- Items: 13 · matched 12 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| officer MG11 | served | served | yes | — |
| charge sheet | served | served | yes | — |
| MGDD form | referred_only | missing | yes | — |
| BWV | referred_only | provisional | yes | — |
| custody record | referred_only | provisional | yes | — |
| medical note | referred_only | missing | yes | — |
| MGDD form | missing | missing | yes | — |
| BWV | missing | provisional | yes | — |
| full custody record | missing | provisional | yes | — |
| medical/fitness note | missing | missing | yes | — |
| warning wording | missing | missing | yes | — |
| whether refusal/warning/reasonable excuse is properly evidenced | not_safely_confirmed | — | no | no_prediction_match |

### sim-062 — No insurance driver identity and keeper trap

- Items: 11 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| SJP notice | served | — | no | no_prediction_match |
| vehicle keeper record | served | — | no | no_prediction_match |
| insurance database printout | served | — | no | no_prediction_match |
| police stop BWV | referred_only | missing | yes | — |
| driver admission | referred_only | missing | yes | — |
| policy correspondence | referred_only | missing | yes | — |
| BWV/stop evidence | missing | missing | yes | — |
| driver admission/interview | missing | missing | yes | — |
| insurance policy/cancellation notice | missing | missing | yes | — |
| proof of use | missing | missing | yes | — |
| whether Meera was the driver and whether insurance status is correctly evidenced | inferred_only | — | no | no_prediction_match |

### sim-063 — Benefit fraud agency records missing

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| DWP summary | served | incomplete | no | — |
| interview summary | incomplete | incomplete | yes | — |
| benefit claim records | referred_only | missing | yes | — |
| notification logs | referred_only | missing | yes | — |
| overpayment calculation | referred_only | missing | yes | — |
| full claim history | missing | missing | yes | — |
| notification logs | missing | missing | yes | — |
| overpayment calculation | missing | missing | yes | — |
| interview recording/transcript | missing | provisional | yes | — |
| knowledge, dishonesty, and calculation basis | inferred_only | — | no | no_prediction_match |

### sim-066 — Perverting justice route bleed from fraud-document paperwork

- Items: 11 · matched 7 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | — | no | no_prediction_match |
| charge sheet | served | — | no | no_prediction_match |
| email exhibit summary | incomplete | — | no | no_prediction_match |
| full email export | referred_only | missing | yes | — |
| case chronology | referred_only | missing | yes | — |
| police decision log | referred_only | missing | yes | — |
| full email export | missing | missing | yes | — |
| chronology | missing | missing | yes | — |
| intention evidence | missing | missing | yes | — |
| exhibit continuity | missing | missing | yes | — |
| intent to pervert justice versus administrative/document confusion | inferred_only | — | no | no_prediction_match |

### sim-067 — Bladed article reasonable excuse and location continuity

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| seizure statement | served | served | yes | — |
| charge sheet | served | served | yes | — |
| BWV | referred_only | provisional | yes | — |
| CCTV | referred_only | provisional | yes | — |
| knife photographs | referred_only | missing | yes | — |
| BWV/CCTV | missing | missing | yes | — |
| location plan | missing | missing | yes | — |
| photographs/measurements | missing | missing | yes | — |
| interview/reasonable excuse account | missing | missing | yes | — |
| public place, possession, and reasonable excuse | not_safely_confirmed | — | no | no_prediction_match |

### sim-069 — Coercive control course of conduct and digital export missing

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| complainant statement | served | served | yes | — |
| selected screenshots | incomplete | incomplete | yes | — |
| full phone download | referred_only | missing | yes | — |
| chronology | referred_only | missing | yes | — |
| third-party statements | referred_only | missing | yes | — |
| full digital export | missing | missing | yes | — |
| course-of-conduct chronology | missing | missing | yes | — |
| third-party statements | missing | missing | yes | — |
| context/counter-allegation material | missing | missing | yes | — |
| pattern, attribution, and context | not_safely_confirmed | — | no | no_prediction_match |

### sim-076 — EncroChat handle dispute — rotated scanned export

- Items: 7 · matched 6 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| partial EncroChat screenshots | incomplete | incomplete | yes | — |
| rotated scan pages | incomplete | incomplete | yes | — |
| full platform extraction | referred_only | missing | yes | — |
| handle mapping certificate | missing | missing | yes | — |
| device continuity | missing | missing | yes | — |
| co-defendant chat map | other_defendant_only | other_defendant_only | yes | — |
| shared thread messages | not_safely_confirmed | — | no | no_prediction_match |

### sim-077 — EncroChat — bad OCR broken handle labels

- Items: 4 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| OCR-broken message screenshots | served | incomplete | no | — |
| platform export | referred_only | missing | yes | — |
| authenticated extraction | missing | missing | yes | — |
| handle mapping | missing | missing | yes | — |

### sim-078 — EncroChat — mixed defendants in one PDF

- Items: 5 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| mixed defendant message excerpts | served | — | no | no_prediction_match |
| co-defendant schedules | referred_only | other_defendant_only | no | fuzzy_match:0.75 |
| per-defendant exhibit map | missing | missing | yes | — |
| handle mapping | missing | missing | yes | — |
| co-defendant NIGHTHAWK thread | not_safely_confirmed | — | no | no_prediction_match |

### sim-079 — EncroChat — index-only listing without export

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 summary reference to Encro | served | — | no | no_prediction_match |
| EncroChat platform export | referred_only | missing | yes | — |
| full extraction | missing | missing | yes | — |
| handle-to-user certificate | missing | missing | yes | — |

### sim-080 — Phone download — duplicate rotated pages

- Items: 6 · matched 5 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| duplicate screenshot pages | served | — | no | no_prediction_match |
| partial handset notes | served | incomplete | no | — |
| UFED extraction | referred_only | missing | yes | — |
| full download | missing | missing | yes | — |
| search scope schedule | missing | missing | yes | — |
| continuity | missing | missing | yes | — |

### sim-081 — Phone attribution — cellsite summary only

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| cellsite summary table | served | — | no | no_prediction_match |
| full cellsite dump | referred_only | missing | yes | — |
| subscriber data | missing | missing | yes | — |
| handset extraction | missing | missing | yes | — |

### sim-082 — Phone scope — search terms schedule missing

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| skewed scan digital summary | served | — | no | no_prediction_match |
| full handset download | referred_only | missing | yes | — |
| search terms | missing | missing | yes | — |
| extraction continuity | missing | missing | yes | — |

### sim-083 — Encro + phone overlap — attribution disputed

- Items: 7 · matched 6 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Encro partial | served | incomplete | no | — |
| phone screenshots | served | incomplete | no | — |
| phone UFED | referred_only | missing | yes | — |
| Encro export | referred_only | missing | yes | — |
| attribution certificate | missing | missing | yes | — |
| per-device map | missing | missing | yes | — |
| same user on Encro and handset | not_safely_confirmed | — | no | no_prediction_match |

### sim-084 — County lines — bad OCR line labels

- Items: 5 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| OCR-broken message pages | served | — | no | no_prediction_match |
| cellsite summary | referred_only | missing | yes | — |
| line holder evidence | missing | missing | yes | — |
| full cellsite | missing | missing | yes | — |
| runner vs holder | not_safely_confirmed | missing | yes | fuzzy_match:0.45 |

### sim-085 — Drug conspiracy — corrected indictment pages

- Items: 6 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| amended indictment | served | missing | no | over_cautious |
| old count pages | served | — | no | no_prediction_match |
| telecom data | referred_only | missing | yes | — |
| per-defendant map | missing | missing | yes | — |
| count linkage schedule | missing | missing | yes | — |
| which counts remain live | not_safely_confirmed | — | no | no_prediction_match |

### sim-086 — Telecom conspiracy — summary without raw data

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| telecom analyst summary | served | — | no | no_prediction_match |
| raw call data | referred_only | missing | yes | — |
| subscriber download | missing | missing | yes | — |
| cellsite dump | missing | missing | yes | — |

### sim-087 — County lines — vulnerability marker OCR scan

- Items: 5 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| arrest summary with marker | served | — | no | no_prediction_match |
| safeguarding referral | referred_only | missing | yes | — |
| NRM outcome | missing | missing | yes | — |
| line attribution | missing | missing | yes | — |
| exploitation vs choice | not_safely_confirmed | — | no | no_prediction_match |

### sim-088 — Conspiracy — missing MG6 schedule detail

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG6C header only | served | — | no | no_prediction_match |
| lab summary | referred_only | missing | yes | — |
| detailed MG6 lines | missing | missing | yes | — |
| per-defendant exhibits | missing | missing | yes | — |

### sim-089 — County lines — duplicate message pages

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| duplicate screenshot sets | served | — | no | no_prediction_match |
| handset download | referred_only | missing | yes | — |
| source export | missing | missing | yes | — |
| line map | missing | missing | yes | — |

### sim-090 — Conspiracy PWITS — two-column schedule OCR

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| two-column exhibit schedule | served | — | no | no_prediction_match |
| group chat export | referred_only | missing | yes | — |
| per-defendant segregation | missing | missing | yes | — |
| telecom raw | missing | missing | yes | — |

### sim-091 — Telecom conspiracy — skewed large bundle

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| skewed analyst summary | served | — | no | no_prediction_match |
| telecom dump | referred_only | missing | yes | — |
| raw data download | missing | missing | yes | — |
| continuity | missing | missing | yes | — |

### sim-092 — Multi-hand assault — skewed BWV stills

- Items: 5 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| skewed BWV stills | served | served | yes | — |
| full BWV | referred_only | missing | yes | — |
| full BWV window | missing | missing | yes | — |
| MG11 accounts | missing | missing | yes | — |
| who struck | not_safely_confirmed | — | no | no_prediction_match |

### sim-093 — Joint enterprise — duplicate conflicting MG11

- Items: 6 · matched 6 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| two MG11 versions | served | served | yes | — |
| partial BWV | served | incomplete | no | — |
| full BWV | referred_only | missing | yes | — |
| signed final MG11 | missing | missing | yes | — |
| medical | missing | missing | yes | — |
| which MG11 is final | not_safely_confirmed | incomplete | no | — |

### sim-094 — S18 — medical referred only rotated scan

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 injury summary | served | — | no | no_prediction_match |
| medical report | referred_only | missing | yes | — |
| medical report | missing | missing | yes | — |
| imaging | missing | missing | yes | — |

### sim-095 — Violence — corrected charge s20 to s18

- Items: 5 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| amended charge sheet | served | — | no | no_prediction_match |
| old s20 wording | served | — | no | no_prediction_match |
| medical | referred_only | missing | yes | — |
| medical | missing | missing | yes | — |
| intent material | missing | missing | yes | — |

### sim-096 — Multi-defendant — wrong name OCR confusion

- Items: 5 · matched 5 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| OCR witness summary | served | served | yes | — |
| BWV | referred_only | missing | yes | — |
| clear ID accounts | missing | missing | yes | — |
| BWV export | missing | missing | yes | — |
| which male witness means | not_safely_confirmed | incomplete | no | — |

### sim-097 — Robbery — CCTV stills rotated poor quality

- Items: 4 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| rotated CCTV stills | served | served | yes | — |
| master footage | referred_only | missing | yes | — |
| full CCTV | missing | missing | yes | — |
| ID procedure | missing | missing | yes | — |

### sim-098 — Assault — BWV referred index-only listing

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 officer account | served | — | no | no_prediction_match |
| BWV full export | referred_only | missing | yes | — |
| BWV download | missing | missing | yes | — |
| custody record | missing | missing | yes | — |

### sim-099 — Public order — group conduct bleed OCR

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| OCR group summary | served | — | no | no_prediction_match |
| BWV clips | referred_only | missing | yes | — |
| per-defendant conduct map | missing | missing | yes | — |
| full BWV | missing | missing | yes | — |

### sim-100 — Robbery — CCTV pages out of order

- Items: 4 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| out-of-order CCTV clips | served | incomplete | no | — |
| master timeline | referred_only | missing | yes | — |
| full window export | missing | missing | yes | — |
| continuity | missing | missing | yes | — |

### sim-101 — Historic sexual — bad OCR MG5 summary

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| OCR MG5 summary | served | — | no | no_prediction_match |
| ABE interview | referred_only | missing | yes | — |
| ABE recording | missing | missing | yes | — |
| MG11 first account | missing | missing | yes | — |

### sim-102 — Sexual — ABE index-only bundle

- Items: 4 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 summary only | served | incomplete | no | — |
| ABE interview | referred_only | missing | yes | — |
| ABE recording | missing | missing | yes | — |
| transcript | missing | missing | yes | — |

### sim-103 — Historic sexual — third-party hearsay rotated

- Items: 4 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| third-party hearsay summary | served | — | no | no_prediction_match |
| complainant ABE | referred_only | missing | yes | — |
| primary complainant account | missing | missing | yes | — |
| ABE | missing | missing | yes | — |

### sim-104 — Sexual — mixed offences PDF bleed

- Items: 5 · matched 3 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| sexual MG5 | served | — | no | no_prediction_match |
| unrelated fraud index | served | — | no | no_prediction_match |
| ABE | referred_only | missing | yes | — |
| ABE | missing | missing | yes | — |
| medical | missing | missing | yes | — |

### sim-105 — Robbery ID — VIPER missing skewed bundle

- Items: 4 · matched 4 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| CCTV stills | served | served | yes | — |
| VIPER | referred_only | missing | yes | — |
| VIPER procedure | missing | missing | yes | — |
| full CCTV | missing | missing | yes | — |

## Limits

- Controlled/simulator/proof fixtures only — not unseen real-world solicitor bundles.
- `wrong_family_bleed_rate`, `court_note_safety_rate`, and `client_summary_safety_rate` are placeholders in v1.
- Unmatched truth items reduce accuracy denominators only where predictions exist.

