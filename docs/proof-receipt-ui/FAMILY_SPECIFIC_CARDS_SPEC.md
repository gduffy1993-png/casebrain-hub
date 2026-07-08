# Family-Specific Proof Cards — Specification

**Status:** Spec only — **no implementation in this branch.**  
**Branch:** `feature/proof-receipt-ui-spec`

---

## 1. Purpose

**Family-specific proof cards** surface offence-context review points that generic Truth Map rows may under-explain. Each card links to Truth Map rows and Proof Receipts; it does **not** change underlying evidence states or invent new facts.

Cards appear when **family profile + material presence** triggers a check. One matter may show zero, one, or several cards.

---

## 2. Card anatomy (shared)

Every family card uses the same layout:

| Element | Content |
|---------|---------|
| **Title** | Plain English family name (e.g. “CCTV — stills vs master”) |
| **Why shown** | One sentence: what material triggered the card |
| **Truth Map rows** | Linked items with state badges |
| **Safe summary** | Audit-controlled wording — what can and cannot be said |
| **Blocked unsafe wording** | Bulleted phrases from copy gate |
| **Primary action** | Check / Chase / Do not use (one badge) |
| **Receipts** | Linked output lines across surfaces |

Fixed mini-guard on each card:

> **Family review aid.** Confirm against source material. Not a finding of admissibility or case outcome.

---

## 3. Family cards (required set)

### 3.1 Phone attribution

**Trigger:** Call logs, cell site, handset downloads, or attribution schedules present; attribution to defendant not fully served.

**Shows:**

- Which attribution material is served vs referred only vs missing.
- Whether output lines name a subscriber or handset without served download proof.

**Safe summary example:**

> “Schedule references handset attribution; full download or subscriber evidence not located in bundle — review before stating who operated the line.”

**Default action:** Chase (if missing/referred) or Check (if partial served).

**Blocked examples:**

- “Proves defendant sent the messages.”
- “Phone confirms guilt.”

---

### 3.2 CCTV stills vs master

**Trigger:** Stills, snapshots, or clip exports served without master recording or continuity statement.

**Shows:**

- Stills exhibit refs vs master status on MG6C / schedule.
- Continuity / hash / export metadata if served.

**Default action:** Chase when master referred only or missing.

**Blocked examples:**

- “CCTV proves identification beyond reasonable doubt.”
- “Full footage confirms timeline” (when master not served).

---

### 3.3 BWV referred-only

**Trigger:** Body-worn video listed on schedule or mentioned in statements; file referred only or not in bundle.

**Shows:**

- Schedule row vs file presence.
- Whether any output line describes BWV content not in bundle.

**Default action:** Chase.

**Blocked examples:**

- “Officer camera shows defendant committing offence.”
- “BWV confirms account” (when referred only).

---

### 3.4 Co-defendant-only

**Trigger:** Interview, statement, or material marked **other-defendant-only** or clearly relates to co-defendant only.

**Shows:**

- Which items are scoped to another defendant.
- Warning if output lines import co-defendant material into this defendant’s position.

**Default action:** Do not use (for this defendant’s court/client lines until reviewed).

**Blocked examples:**

- “Co-defendant implicates your client — joint enterprise proven.”
- “Use co-defendant interview in client summary.”

---

### 3.5 Youth safeguards

**Trigger:** Defendant under 18 at relevant time, or youth flags in metadata; interview / custody material present.

**Shows:**

- Appropriate adult, YJS, custody clock, interview recording status.
- Referred-only or missing safeguard documentation.

**Default action:** Check (Chase for missing AA / recording).

**Blocked examples:**

- “Interview admissible — no youth issues.”
- “Safeguards confirmed” (when not served).

---

### 3.6 Medical report missing

**Trigger:** Injury, GBH, assault, or medical evidence alleged; medical report or FME referred only or missing.

**Shows:**

- MG21 / medical schedule entries vs served reports.
- Whether output lines describe injury mechanism from non-medical sources only.

**Default action:** Chase.

**Blocked examples:**

- “Medical evidence confirms injury severity as charged.”
- “Expert supports prosecution account” (when report missing).

---

### 3.7 Encro handle attribution

**Trigger:** Encrypted comms (Encro / similar) attribution material in case type or schedules.

**Shows:**

- Handle-to-device attribution status.
- Co-defendant or pool handset issues if present.

**Default action:** Check or Chase depending on state.

**Blocked examples:**

- “Handle proves defendant is user.”
- “Encro messages prove conspiracy” (without served attribution chain).

---

### 3.8 Motoring calibration / device

**Trigger:** Speed, breath, drug drive, or device-based motoring allegation; calibration / device certificate issues.

**Shows:**

- Device serial, calibration certificate, MGD forms status.
- Partial served bundles (e.g. printout without calibration).

**Default action:** Check or Chase.

**Blocked examples:**

- “Reading is conclusive.”
- “Device properly calibrated” (when certificate missing).

---

### 3.9 Bail / restraining order proof

**Trigger:** Breach of bail, restraining order, or non-molestation charge; order / bail conditions material relevant.

**Shows:**

- Served order vs draft; proof of service; condition text anchor.
- Whether output lines quote conditions not in served order.

**Default action:** Check (Chase if order missing).

**Blocked examples:**

- “Defendant clearly breached valid order” (when order not served).
- “Conditions as stated in charge” (without order text).

---

### 3.10 Expert evidence missing

**Trigger:** Expert discipline flagged (forensic, digital, pathology, accident reconstruction); report referred only or missing.

**Shows:**

- Expert name / discipline on schedule vs report file.
- Whether output lines treat expert conclusions as served.

**Default action:** Chase.

**Blocked examples:**

- “Expert supports prosecution.”
- “Forensic evidence confirms” (when report missing).

---

### 3.11 Mental health / intermediary / interpreter

**Trigger:** Fitness, mental health, intermediary, or interpreter need flagged; interview or translated material present.

**Shows:**

- Assessment / intermediary / interpreter booking status.
- Translated message bundles vs source language material.

**Default action:** Check or Chase.

**Blocked examples:**

- “Client understood interview — no vulnerability.”
- “Translation confirms content” (when quality or interpreter record missing).

---

### 3.12 OCR / redaction / wrong date or court

**Trigger:** OCR failure, redaction block, or document metadata mismatch (wrong date, wrong court, wrong defendant name on key doc).

**Shows:**

- Affected documents and pages.
- Which output lines cite affected text.

**Default action:** Do not use until corrected or manually verified.

**Blocked examples:**

- “Document confirms date of offence” (when date OCR wrong).
- “Correct court bundle” (when header shows wrong court).

---

## 4. UI placement

| Location | Behaviour |
|----------|-----------|
| Evidence Truth Map | Family chip on row; click opens card drawer |
| Proof Receipt drawer | “Related family card” link when triggered |
| Matter overview | “Family review cards” collapsible section — max 3 visible, rest in “View all” |
| Exports | One-line family summary in CPS chase proof and matter brief |

Cards **never** stack duplicate warnings for the same underlying row; one primary card per trigger cluster.

---

## 5. Card interaction

- **Open source** — document viewer to primary row anchor.
- **View receipts** — filtered list for family-linked lines.
- **Chase** — pre-filled gap when chase module supports it (future build).
- **Dismiss** — user may hide card for session only; does not change state (optional firm setting).

No “Accept risk” or “Ignore safeguard” language — only **Check**, **Chase**, **Do not use**.

---

## 6. Cross-family rules

- Harassment matter with phone material → phone attribution only; no motoring card unless device material present.
- Drugs matter → medical/expert cards only when injury or forensic expert triggered; lab missing uses Truth Map + chase, may share expert card if forensic expert expected.
- Multi-defendant → co-defendant card independent per defendant scope.

---

## 7. Explicit prohibitions

- Cards must **not** recommend plea or trial strategy.
- No **guilty/not guilty** framing.
- No invented **solicitor endorsements** (“Counsel agreed CCTV sufficient”).
- No claim of **real-world accuracy** beyond bundle classification.
- No dev labels (`family_check_id_v2`) in card title.

---

## 8. Acceptance criteria

- [ ] All twelve family types defined with trigger, action, safe summary pattern, and blocked examples.
- [ ] Each card links to ≥1 Truth Map row when shown.
- [ ] Cards never appear without triggered material (no empty scare cards).
- [ ] Fee-earner understands card purpose in **under 20 seconds**.
- [ ] Full matter family section scannable in **under 2 minutes** with ≤6 active cards on pilot matters.

---

## 9. Implementation notes (future)

1. Plugin registry: `familyId`, trigger predicate, copy templates, blocked phrases.
2. Run after generic Truth Map classification — **read-only** on states.
3. Golden fixtures per family in demo pack (see DEMO_CASE_SELECTION_CRITERIA.md).

---

## Document control

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Created | 2026-07-09 |
| Related | [EVIDENCE_TRUTH_MAP_UI_SPEC.md](./EVIDENCE_TRUTH_MAP_UI_SPEC.md), [PROOF_RECEIPT_UI_SPEC.md](./PROOF_RECEIPT_UI_SPEC.md) |
