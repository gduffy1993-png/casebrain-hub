# HUMAN REVIEW PACK — Legal Intelligence Recovery V1

**Gate type:** Read-only human review (no merge / push / UI redesign / corpus run)  
**Recovery branch:** `programme/legal-intelligence-recovery-v1` @ `b374c514d`  
**Baseline (current neutered / release candidate):** `programme/real-pdf-live-pilot-v1` @ `170bfcee4`  
**Case Moves origin:** `6de1c4c24`  
**Review date:** 2026-08-20  
**Companion dump (quoted live outputs):** `HUMAN-REVIEW-LIVE-DUMP.json`  
**Companion machine summary:** `HUMAN-REVIEW-PACK.json`

---

## Verdict (exactly one)

# `RESTORATION_GOOD_BUT_INCOMPLETE`

Engine-level cleverness is real and bounded. Patel + 12/12 proof walls hold for truth-safety and advisory intelligence. Restored output is clearly better than both old unsafe authority and current silence. It is **not** yet solicitor-complete: multi-surface *allow-lists* exist, but **no Overview/Court/Papers/Client/CPS Chase/File/Hearing/Export UI consumes `legalIntelligence` / `overviewConsiderations`**. Several matters still lean on generic case-move boilerplate; negation false-positives and weak order-breach intelligence remain.

**Ready for 3–5 live PDF-vs-UI human checks?** **Not yet as a cleverness check.** PDF-vs-UI would largely re-verify current neutered surfaces unless the reviewer inspects adapter/API dump fields. Do those checks only after advisory is labelled on at least Overview (and ideally Papers/Court), or treat them as truth-safety-only checks.

---

## What this pack is (and is not)

| Is | Is not |
|----|--------|
| Side-by-side behavioural evidence with **quoted** restored text | A merge authorisation |
| Patel factual boundary proof | Pilot / production readiness |
| Hunt for lost cleverness despite 12/12 | A giant corpus run |
| Surface wiring map (read-only) | New product wiring |

Inputs read: side-by-side report, cleverness truth-set MD/JSON, FINAL-REPORT, Case Moves notes, component inventory, LEGAL-INTELLIGENCE-RECOVERY-V1.json, Patel fixture, live dump via `buildLegalIntelligence`, adapter + authenticated matter path, git quotes from pre-claim-truth playbooks (`f59e5d057^`) and Case Moves (`6de1c4c24`).

---

## Architecture confirmed

```
SOURCE → OBSERVATIONS → RECONCILIATION → CANONICAL TRUTH 🔒
                                      → LEGAL INTELLIGENCE / CASE MOVES 🧠
                                      → solicitor considerations (advisory)
```

| Layer | Authority after recovery |
|-------|--------------------------|
| Canonical evidence state | Sole factual authority — unchanged |
| Chase source gate | Fact/chase emission — unchanged |
| Legal intelligence | Advisory only — **new** `lib/criminal/legal-intelligence` |
| Case Moves | Advisory adapter from `6de1c4c24` |
| CPS Chase | `considerationsForSurface(..., "cps_chase") === []` always |

Firewall remains hard-false: missing/served counters, readiness, auto-chase, client fact, court assertion, canonical mutation.

---

## Legend for examples

| Marker | Meaning |
|--------|---------|
| **OLD SMART** | Historical clever / unsafe-as-fact behaviour (quoted from git / programme notes) |
| **CURRENT SAFE/NEUTERED** | Baseline `170bfcee4` — gates kept; cleverness largely silent or demoted |
| **RESTORED** | Recovery HEAD live `buildLegalIntelligence` output (quoted) |
| Epistemic | `SOURCE_FACT` · `SAFE_DERIVATION` · `PRACTITIONER_CONSIDERATION` |

---

## A. Patel Affray — full checklist with quotes

**Seed ID:** `7e763777-94a8-4958-a190-a35ef6ddb259`  
**Source (canonical facts establish):** `PATEL_SOURCE_BUNDLE` — Affray; Southford Magistrates' Court; 25 August 2026; CCTV master outstanding; custody 3–5 outstanding; final signed MG11 outstanding; interview summary on file / full recording-transcript outstanding; CAD listing timing; “Continuity of CCTV sources: to be checked.”

### A1. Established vs NOT established vs considerations

| Claim | Class | Status on restored | Quote / evidence |
|-------|-------|--------------------|------------------|
| Affray | SOURCE_FACT | **ESTABLISHED** | `"value": "Affray"` |
| Southford Magistrates' Court | SOURCE_FACT | **ESTABLISHED** | `"Southford Magistrates' Court"` |
| Hearing 25 Aug 2026 | SOURCE_FACT | **ESTABLISHED** | `"25 August 2026"` |
| Full CCTV master outstanding | SOURCE_FACT | **ESTABLISHED** | `"The full CCTV master footage/export log is outstanding."` |
| Custody pages 3–5 outstanding | SOURCE_FACT | **ESTABLISHED** | `"Custody record pages 3-5 are outstanding."` |
| Final signed MG11 outstanding | SOURCE_FACT | **ESTABLISHED** | `"Final signed MG11 is outstanding."` |
| Full interview transcript outstanding | SOURCE_FACT | **ESTABLISHED** | `"Full interview recording/transcript is not served and remains outstanding."` |
| Interview recording/transcript service issue | SOURCE_FACT + PRACTITIONER_CONSIDERATION | **SOURCE-BACKED** + modality consideration | Fact line above + restored: *“Consider separating interview summary vs full recording vs transcript service issues…”* |
| CAD / listing timing | SOURCE REFERENCE → PRACTITIONER_CONSIDERATION | **CAD check, not 999 fact** | *“The CAD / listing timing reference may justify checking whether related call or control-room material exists or is relevant.”* |
| 999 audio outstanding | — | **NOT ESTABLISHED** | Reason: *“CAD/listing timing does not establish 999 audio as outstanding.”* |
| Medical evidence missing | — | **NOT ESTABLISHED** | Family medical absent |
| BWV missing | — | **NOT ESTABLISHED** | Family bwv absent |
| CCTV continuity missing (from “to be checked” alone) | — | **NOT ESTABLISHED** | *“'To be checked' does not establish CCTV continuity as missing.”* |
| Self-defence as established live position | — | **NOT ESTABLISHED** | *“Offence type Affray does not establish self-defence as a live case theory.”* |

### A2. Side-by-side behaviour (Patel)

| Theme | OLD SMART | CURRENT SAFE/NEUTERED (`170bfcee4`) | RESTORED (quoted) | Epistemic | Why useful to a criminal solicitor |
|-------|-----------|-------------------------------------|-------------------|-----------|-----------------------------------|
| Self-defence / first contact | Playbook (pre-`f59e5d057`): *“whether self-defence/first contact remains live.”* Case Moves (`6de1c4c24`): *“Plead self-defence with two stages…”* | Playbook demoted: *“whether self-defence or first contact arises is a solicitor consideration only…”*; no LI lane; Case Moves **absent** from tree | *“Consider whether self-defence or first-contact issues arise on instructions and the evidence sequence.”* + notEstablished blocks live theory | PRACTITIONER_CONSIDERATION (not fact) | Spots the fight path without falsely pleading it |
| CAD vs 999 | Stock risk: CAD ⇒ assert 999 outstanding | Chase gate drops unsupported 999; little positive CAD intelligence | CAD consideration **without** 999 fact; chase brief keeps CCTV, drops phone/medical/BWV/999 | PRACTITIONER_CONSIDERATION | Sequence timing question without inventing audio |
| BWV | Offence/violence ⇒ BWV missing chase | Gate: bwv family **absent** on Patel → no BWV chase | *“Consider whether BWV exists or requires checking…”* + **BWV missing NOT ESTABLISHED** | PRACTITIONER_CONSIDERATION | Investigative question, not missing counter |
| CCTV clip vs master | Clip/master confusion; continuity invent from weak language | Explicit master outstanding preserved; continuity not invented | Master **established**; *“Consider distinguishing CCTV stills/clips from master…”*; continuity **not** established | SOURCE_FACT + PRACTITIONER_CONSIDERATION | Protects fair-trial disclosure ask without overclaim |
| Interview modality | Summary conflated with recording/transcript | Explicit outstanding preserved via gates | Established outstanding + *“separating interview summary vs full recording vs transcript…”* | SOURCE_FACT + PRACTITIONER_CONSIDERATION | Stops false “interview served” wording |
| Tactical disclosure moves | Case Moves disclosure packs (unwired historically) | No Case Moves on baseline | *“Issue a written disclosure request for the full unedited CCTV window with continuity…”*; MG11 / custody disclosure moves | PRACTITIONER_CONSIDERATION | Actionable CPIA framing without auto-chase |
| Medical | Violence ⇒ medical outstanding | Absent family → no medical chase | *“Consider whether medical or injury evidence is relevant…”* + medical **NOT ESTABLISHED** | PRACTITIONER_CONSIDERATION | Harm/causation question without inventing report |

**Patel restored volume (live dump):** 7 established · 5 not-established · 13 considerations (incl. 5 case-moves). CPS chase advisory count: **0**.

---

## B. Boundary proof — considers without promoting

These examples prove restored **thinks about** high-risk topics without making them case facts or missing-evidence rows.

| Topic | Source establishes | Restored considers (quote) | Explicitly does **not** establish |
|-------|--------------------|----------------------------|-----------------------------------|
| BWV (Patel) | No BWV language | *“Consider whether BWV exists or requires checking where arrest / officer / violence circumstances make that a sensible investigative question.”* | `BWV missing` NOT ESTABLISHED; offence cannot promote (`attemptSafePromotion` Affray→BWV fails) |
| BWV (PROOF-03, source-backed) | *“BWV referred on schedule but not served — outstanding.”* | *“Consider how served or outstanding BWV will be used for sequence, force, and first-contact analysis…”* | Does not invent interview from custody; fight path warns *“never invent interview recording from custody alone”* |
| CAD / 999 (Patel) | CAD listing timing only | CAD-related call/control-room check | `999 audio outstanding` NOT ESTABLISHED |
| Self-defence (Patel / PROOF-12) | Affray / ABH charge only | *“Consider whether self-defence or first-contact issues arise…”* | `self-defence as established live case position` NOT ESTABLISHED; no “remains live” in consideration blob |
| Medical (Patel) | None | Low-confidence medical relevance consideration | `medical evidence missing` NOT ESTABLISHED |
| Medical (PROOF-05) | Hospital discharge + *“Full medical report outstanding.”* | Fight: *“Consider medical / causation attack paths…”* + intent reduction | Phone/BWV invent blocked (`mustRemainAbsent: phone`) |
| CCTV continuity (Patel) | *“to be checked”* | Clip/master distinction consideration | `CCTV continuity missing` NOT ESTABLISHED |
| Interview recording/transcript (Patel, PROOF-07) | Explicit outstanding / co-def vs defendant split | Modality separation; ID/participation on robbery | Co-def interview does **not** mark defendant interview served |
| Identification (PROOF-07) | Robbery + co-def interview + CCTV master | *“Consider identification and participation issues (including Turnbull…)”* | No BWV/medical invent |
| Disclosure / tactical (Patel) | CCTV master, MG11, custody outstanding | Case-move written disclosure requests (CCTV/MG11/custody) | `cps_chase` surface filter empty; chase brief still source-gated |

Safe promotion check (regression): source *“BWV from PC Smith remains outstanding…”* → promotes to `SOURCE_FACT`; Affray-only → stays `PRACTITIONER_CONSIDERATION`.

---

## C. All 12 proof matters — OLD → CURRENT → RESTORED

Live restored quotes from `HUMAN-REVIEW-LIVE-DUMP.json`. Historical smart/unsafe from truth-set + git. Current = baseline behaviour: gates keep absences; no Case Moves / LI lane at `170bfcee4`.

### PROOF-01 — Isaac Patel affray / CCTV+interview
See §A. **Strongest restored:** self-defence consideration; CAD timing; clip/master; interview modality; CCTV/MG11/custody case-moves. **Unsafe not restored:** self-defence live; 999/medical/BWV facts.

### PROOF-02 — Phone harassment / attribution
| | |
|--|--|
| Source | Screenshots served; full phone download/subscriber outstanding; *“No BWV. No CCTV.”* |
| OLD SMART | Attribution gap screenshots vs download |
| CURRENT | Drops unsupported media chase |
| RESTORED (strong) | *“Consider attribution: screenshots vs full download / subscriber mapping before any definitive attribution wording.”* · established phone download outstanding |
| RESTORED (defect) | Also emits BWV/CCTV “confirm status / clip vs master” because `\bbwv\b`/`\bcctv\b` match inside *“No BWV. No CCTV.”* — **false positive from negation** |
| Epistemic | Attribution: PRACTITIONER_CONSIDERATION; download: SOURCE_FACT |
| Solicitor value | Attribution discipline is real; negation bug dilutes trust |

### PROOF-03 — BWV / custody (assault emergency worker)
| | |
|--|--|
| Source | Custody extract served; BWV outstanding on schedule; interview **not mentioned** |
| OLD SMART | PACE/BWV fight paths |
| CURRENT | Custody≠interview gate |
| RESTORED (strong) | BWV tactical use; *“Consider PACE / custody safeguard attack paths…”*; self-defence may arise |
| RESTORED (weak) | Still emits case-move *“full interview record (recording + ROTI / ROVI)”* despite “Interview recording not mentioned” — advisory, but **too eager** |
| Boundary held | Interview not established as missing fact from custody alone |
| Epistemic | BWV outstanding SOURCE_FACT; PACE/BWV PRACTITIONER_CONSIDERATION |

### PROOF-04 — CCTV stills vs master (theft)
| | |
|--|--|
| OLD SMART | Clip vs master + dishonesty |
| CURRENT | Master outstanding kept; continuity invent blocked |
| RESTORED | *“Consider distinguishing CCTV stills/clips from master…”* + *“Consider dishonesty / belief in right to property and identification of appropriation…”* |
| Epistemic | Master SOURCE_FACT; clip/dishonesty PRACTITIONER_CONSIDERATION |

### PROOF-05 — s.18 intent / medical
| | |
|--|--|
| OLD SMART | Intent reduction + medical causation |
| CURRENT | Medical when sourced; no phone/BWV invent |
| RESTORED | *“Consider whether intent is provable or whether a lesser alternative (e.g. s.20) remains a live charge-reduction discussion.”* + medical/causation fight path + CCTV clip/master |
| Epistemic | Medical outstanding SOURCE_FACT; intent/medical paths PRACTITIONER_CONSIDERATION |
| Note | Generic interview disclosure case-move still appears without interview in bundle |

### PROOF-06 — Drugs supply inference
| | |
|--|--|
| OLD SMART | Supply vs personal use; phone when sourced |
| CURRENT | Phone when sourced; no CCTV/BWV invent |
| RESTORED | *“Consider whether possession is personal use versus supply inference…”* + digital attribution; phone extraction SOURCE_FACT |
| Epistemic | PRACTITIONER_CONSIDERATION + SOURCE_FACT |

### PROOF-07 — Co-defendant interview / robbery
| | |
|--|--|
| OLD SMART | Separate co-def vs defendant interview products; ID/participation |
| CURRENT | Does not treat defendant interview as served from co-def product |
| RESTORED | Interview modality + *“identification and participation issues (including Turnbull…)”*; defendant interview outstanding SOURCE_FACT |
| Epistemic | SOURCE_FACT + PRACTITIONER_CONSIDERATION |

### PROOF-08 — Restraining order breach
| | |
|--|--|
| Source | Order extract; sealed order/service outstanding; complainant MG11 outstanding |
| OLD SMART | Service/proof gaps for breach |
| CURRENT | No domestic→media invent |
| RESTORED (weak) | **Only** three generic case-moves: no-safe-strategy, exhibit schedule, **interview** disclosure — **no order/service-specific or MG11-specific consideration text** |
| Pass reason | Truth-set regex `/disclosure|MG11|order/i` matches the word “disclosure” in boilerplate |
| Lost cleverness | Case-specific breach intelligence thin; interview invent-adjacent |

### PROOF-09 — Youth / appropriate adult
| | |
|--|--|
| OLD SMART | Youth AA/PACE safeguards |
| CURRENT | No medical invent from youth ABH |
| RESTORED | PACE/custody path + interview modality + AA outstanding SOURCE_FACT + self-defence consideration |
| Epistemic | SOURCE_FACT + PRACTITIONER_CONSIDERATION |
| Held | Medical NOT ESTABLISHED |

### PROOF-10 — Encro handle attribution
| | |
|--|--|
| OLD SMART | Handle attribution gap |
| CURRENT | No CCTV/BWV invent from conspiracy |
| RESTORED | Digital attribution consideration; handle mapping outstanding SOURCE_FACT; supply-inference RLS also fires |
| Epistemic | SOURCE_FACT + PRACTITIONER_CONSIDERATION |

### PROOF-11 — Motoring thin bundle
| | |
|--|--|
| OLD SMART | Driving-standard / thin-bundle disclosure |
| CURRENT | No interview/BWV invent |
| RESTORED | Dashcam export outstanding SOURCE_FACT; case-moves thin (generic disclosure cluster); RLS pack has **no dedicated driving entry** — driving intelligence mostly via case-moves/export wording if any |
| Epistemic | SOURCE_FACT; considerations thin/generic |
| Incomplete | Historical “driving standard” sharpness only partially recovered |

### PROOF-12 — Bad redaction / MG11
| | |
|--|--|
| OLD SMART | Redaction as disclosure pressure + violence considerations |
| CURRENT | No “self-defence remains live” |
| RESTORED | Unredacted MG11 outstanding SOURCE_FACT; self-defence consideration (not live); CCTV clip/master; generic case-moves |
| Epistemic | SOURCE_FACT + PRACTITIONER_CONSIDERATION |
| Held | No “self-defence remains live” wording |

---

## D. Lost-cleverness hunt (despite 12/12)

Do **not** treat 12/12 as complete. Explicit findings:

1. **Solicitor-surface invisibility (critical)**  
   `buildLiveProductionSurfacesFromDocumentUnits` attaches `legalIntelligence` + `overviewConsiderations`, and `surfaces` can ride the authenticated matter path when `withSurfaces` is set. Grep across `components/` and `app/` finds **zero** consumers of `overviewConsiderations` / `legalIntelligence`. War Room / Pilot / Chase still use `sayThis` / `doNotOverstate` / chase items — **not** the advisory lane. Restored cleverness is engine-real, **UI-orphan**.

2. **Shared architecture vs actual visibility**  
   `allowedSurfaces` lists overview, court, papers, client, file, hearing_mode, export; fight-engine omits `client` for some items; CPS chase forced empty. Multi-surface **support exists in types/filters**, but **nothing renders it**. Answer: restored intelligence is **not** “only Overview” — it is **not really visible on any solicitor surface yet**.

3. **Generic case-move boilerplate**  
   Across most matters: same trio — `no-safe-strategy`, `disclosure-exhibit-list`, `disclosure-interview`. Useful once; dilutes case-specificity (especially PROOF-08, PROOF-11).

4. **Interview disclosure over-trigger**  
   Case Moves often request full interview record when interview is unmentioned (PROOF-02/03/04/05/06/08). Firewall keeps this out of chase facts, but advisory quality is **safe-but-too-eager**.

5. **Negation false positives (PROOF-02)**  
   *“No BWV. No CCTV.”* still fires BWV/CCTV considerations.

6. **Regex-loose intelligence passes**  
   PROOF-08 “passes” without order-breach-specific spotting — historical smart only partially recovered.

7. **Still gated / not fully re-homed (inventory)**  
   Strategy battleboard gated; brief-plan neutered (wording improved but not rich LI); orphan fight-engine only partially re-homed; aggressive defence / large strategy corpus not systematically surfaced as typed considerations; duplicate fight stacks remain.

8. **Contradictions / duplication**  
   Offence-family + RLS + case-moves often repeat disclosure themes (e.g. Patel CCTV: clip/master consideration **and** CCTV disclosure case-move — related, not contradictory). Self-defence consideration + notEstablished live-position is intentional dual signal, not a contradiction.

9. **Historical pleading sharpness softened (correctly)**  
   Old Case Moves: *“Plead self-defence with two stages…”* → Restored engine: *“If instructions and evidence support it, consider a two-stage self-defence frame…”* + adapter softens high-risk categories. Cleverness kept; unsafe authority removed.

---

## E. Surface wiring review (read-only)

| Surface | Factual path today | Safe analysis / brief | Practitioner considerations (`legalIntelligence`) |
|---------|--------------------|----------------------|--------------------------------------------------|
| Overview / Pilot today | Evidence rows, allegation, chase labels via matter brief | War Room sayThis / doNotOverstate | **Produced** as `overviewConsiderations` on adapter — **not rendered** |
| Court / Hearing War Room | Hearing brief from pipeline | sayThis, askCourtToRecord, instructionsNeeded | Allowed on filter — **not consumed** |
| Papers / File | Evidence state / findings | Limitations, provenance | Allowed — **not consumed** |
| Client | Client-safe war-room lines | Sanitised client wording | Allowed (most packs) — **not consumed** |
| CPS Chase | `buildDisclosureChaseBrief` + chase-source-gate | Supportable requests only | **Hard empty** (`cps_chase` → `[]`) — correct |
| Export / PDF | Export pack / composed prose | Sanitise + limitations | Allowed — **not consumed** |
| API / authenticated matter | `surfaces: LiveProductionSurfaces \| null` | Includes LI fields when built | Available to API consumers **if** they read `surfaces.legalIntelligence` — browser builders do not |

**Clear answer:** Shared architecture **already supports** multi-surface advisory filtering, but restored intelligence is **effectively invisible** to solicitors until Overview (at minimum) renders labelled `PRACTITIONER_CONSIDERATION` items. It is **not** “only Overview” in code design — it is “nowhere in UI” today.

---

## F. Final judgement narrative

### What useful intelligence came back
- Offence-family splits: self-defence / CAD / BWV / medical / clip-master / interview modality as considerations  
- Case Moves disclosure & no-safe-strategy packs (softened self-defence)  
- Fight-engine PACE / medical / ID / disclosure-pack hypotheses (source-filtered)  
- Real-life strategies: public-order sequence, intent reduction, theft dishonesty, supply inference, digital attribution  
- Explicit **not-established** ledger for the classic invent classes  

### What remains missing
- UI/API solicitor visibility of the advisory lane  
- Case-specific depth on thin matters (order breach, motoring)  
- Negation-aware media detection  
- Tighter Case Moves triggering (esp. interview when unmentioned)  
- Fuller re-home of battleboard / strategy corpus as labelled considerations  

### What unsafe behaviour stayed removed
- Affray ⇒ self-defence remains live (as fact)  
- CAD ⇒ 999 outstanding fact  
- Offence ⇒ BWV/medical/phone invent into chase/canonical  
- Continuity missing from “to be checked” alone  
- Advisory auto-ingest into CPS chase  
- Competing truth engines / chase-derived canonical rehydration  

### Better than old unsafe AND current neutered?
**Yes, at the intelligence-engine layer.** Old was clever but polluted facts; current is safe but mute; restored is clever **and** typed advisory — **provided** the reader looks at LI output. For a solicitor using only UI at baseline surfaces, restored ≈ current until wiring lands.

### Ready for 3–5 live PDF-vs-UI human checks?
**Not for cleverness acceptance.** Ready for **truth-safety** spot-checks on Patel-class PDFs (chase/overview must not invent 999/BWV/medical/live SD). Cleverness PDF-vs-UI requires labelled Overview (or dump review) first.

---

## G. Merge / programme recommendation

Align with programme FINAL-REPORT: **`RESTORATION_READY_FOR_REVIEW`** remains the programme engineering verdict; this human gate upgrades behavioural judgement to:

### `RESTORATION_GOOD_BUT_INCOMPLETE`

**Do not merge** to `programme/real-pdf-live-pilot-v1` / PR #66 on proof alone. Next product step (out of scope here): surface labelled considerations on Overview without redesign sprawl; fix negation + interview-overtrigger; then 3–5 PDF-vs-UI checks.

---

## Artefact index used

1. `SIDE-BY-SIDE-BEHAVIOURAL-REPORT.md`  
2. `CLEVERNESS-RECOVERY-TRUTH-SET-RESULTS.md` + `.json`  
3. `FINAL-REPORT.md`  
4. `CASE-MOVES-RESTORE-NOTES.md`  
5. `EXPANDED-COMPONENT-CLASSIFICATION-INVENTORY.md`  
6. `LEGAL-INTELLIGENCE-RECOVERY-V1.json`  
7. `lib/criminal/legal-intelligence/fixtures/patel-source.ts`  
8. Live dump `HUMAN-REVIEW-LIVE-DUMP.json`  
9. Git: `170bfcee4`, `6de1c4c24`, playbooks pre/post `f59e5d057`
