# Gold Case Record — Template

**Case ID:** `gm-XXX-short-label`  
**Status:** draft | in-review | gold | hold | retired  
**Review type:** gold manual review on a controlled bundle — solicitor review required before gold promotion.

---

## 1. Case summary

| Field | Value |
|-------|-------|
| Local case ID | `gm-XXX-short-label` |
| Fictional / anonymised label | e.g. Defendant A |
| Offence family | e.g. PWITS, GBH, motoring, fraud |
| Court level | Magistrates / Crown / SJP |
| Stage | First appearance / PTPH / trial listing / sentence |
| Bundle type | MG5-led / thin SJP / mixed co-defendant / partial disclosure |
| Primary evidence stress | e.g. phone attribution, BWV gap, lab continuity |
| Created | YYYY-MM-DD |
| Last reviewed | YYYY-MM-DD |
| Reviewer | Role only — e.g. supervising solicitor, shadow reviewer |

**One-line purpose:**  
What this case is meant to test (e.g. "partial CCTV served; master footage referred but absent; must not chase already-served stills").

---

## 2. Input bundle

### 2.1 Bundle inventory

| # | Document type | Served? | Complete? | Notes |
|---|---------------|---------|-----------|-------|
| 1 | Charge sheet | | | |
| 2 | MG5 / case summary | | | |
| 3 | MG6C / MG6D | | | |
| 4 | Witness statements | | | |
| 5 | Interview transcript | | | |
| 6 | CCTV / BWV / media log | | | |
| 7 | Expert / forensic | | | |
| 8 | Other | | | |

**Served** = physically in the bundle. **Complete** = sufficient for the stated purpose (e.g. full export vs partial clip).

### 2.2 Bundle defects (if any)

Check all that apply:

- [ ] OCR noise / garbled text
- [ ] Rotated or mis-ordered pages
- [ ] Duplicate pages
- [ ] Redaction hides key fields
- [ ] Index refers to exhibit not attached
- [ ] Draft / unsigned statement included
- [ ] Hearing date mismatch across documents
- [ ] Charge / MG5 / court name drift
- [ ] Partial clip labelled as full footage
- [ ] Transcript without master media
- [ ] Other: _______________

### 2.3 Bundle location

| Location | Path / note |
|----------|-------------|
| Committed | None — controlled bundles are gitignored |
| Local only | `artifacts/casebrain-gold-manual/local/gm-XXX/` |
| Format | `bundle-text.md` and/or local PDF (not committed) |

---

## 3. Truth states

Complete the companion file `truth-state.json` using [TRUTH_STATE_TEMPLATE.json](./TRUTH_STATE_TEMPLATE.json).

Summary table (human-readable):

| Material | Truth state | Source if present | Notes |
|----------|-------------|---------------------|-------|
| Charge | present / partial / absent / unknown | p. __ | |
| MG5 narrative | | | |
| Key witness statement | | | |
| CCTV / BWV | | | |
| Phone / device extract | | | |
| Interview (PACE) | | | |
| Custody record | | | |
| Lab / drugs continuity | | | |
| Expert report | | | |
| ABE / first account | | | |
| Bail / restraining order docs | | | |

**Truth state definitions:**

| State | Meaning |
|-------|---------|
| `present` | In bundle; sufficient for stated use |
| `partial` | In bundle but incomplete (clip, extract, unsigned, redacted) |
| `referred_absent` | Mentioned in index, MG5, or schedule but not attached |
| `not_in_bundle` | Reasonably expected at this stage but not served and not referred |
| `unknown` | Cannot determine from bundle alone |

---

## 4. Expected missing material

List what **should** appear as missing or gap items — and what **should not** be chased because it is already served or not applicable.

### 4.1 Should flag as missing / gap

| Material | Why missing matters | Chase priority (H/M/L) |
|----------|----------------------|------------------------|
| | | |

### 4.2 Should NOT flag as missing

| Material | Why it should not be chased |
|----------|----------------------------|
| | Already served at p. __ |
| | Not applicable at this stage |
| | Referred in MG6 as not used |

---

## 5. Expected unsafe-to-say warnings

Where CaseBrain must **not** assert facts or must use provisional wording.

| Topic | Unsafe if stated as fact | Safe alternative framing |
|-------|---------------------------|--------------------------|
| Identification | | "Bundle contains an ID procedure summary; full BWV not served" |
| Attribution (phone / Encro) | | |
| Drug weight / purity | | |
| Intent / knowledge | | |
| Medical outcome | | |
| Ownership (device / account) | | |
| Timeline certainty | | |

---

## 6. Expected outputs (summary)

Full detail in [EXPECTED_OUTPUT_TEMPLATE.md](./EXPECTED_OUTPUT_TEMPLATE.md). Brief summary:

### 6.1 Court line

- Key point 1: _______________
- Key point 2: _______________
- Must avoid: _______________

### 6.2 CPS chase

- Request 1: _______________
- Must not request: _______________

### 6.3 Client summary

- Plain-English headline: _______________
- Must avoid over-confidence: _______________

### 6.4 Proof receipt

- Lines requiring receipt anchor: _______________
- Expected source links: _______________

---

## 7. Source / page expectations

| Output line (paraphrase) | Expected source | Page / anchor | Excerpt note |
|--------------------------|-------------------|---------------|--------------|
| | MG5 | p. 3 | |
| | MG11 | p. 12–14 | |
| | Schedule | item 4 | referred absent |

---

## 8. Reviewer notes

### 8.1 Review session log

| Date | Reviewer role | Action | Outcome |
|------|---------------|--------|---------|
| | | Initial truth state completed | draft |
| | | Compared CaseBrain output | pass / partial / fail |

### 8.2 Open questions

- 
- 

### 8.3 Hold / retire reasons (if applicable)

- 

### 8.4 Sign-off (gold promotion only)

| Field | Value |
|-------|-------|
| Gold promoted | YYYY-MM-DD or **not yet** |
| Sign-off role | Supervising solicitor or delegated reviewer |
| Sign-off note | "Controlled bundle manually reviewed; suitable for gold regression set" |
| **Do not** record fabricated quotes or endorsements | |

---

## 9. Scoring reference

Score this case using [GOLD_PACK_SCORING.md](./GOLD_PACK_SCORING.md).

| Surface | Score | Notes |
|---------|-------|-------|
| Missing material | | |
| Unsafe-to-say | | |
| Court line | | |
| CPS chase | | |
| Client summary | | |
| Proof receipt | | |
| Source linkage | | |
| Surface discipline | | |
| **Overall** | | |

Complete [FALSE_POSITIVE_REVIEW_FORM.md](./FALSE_POSITIVE_REVIEW_FORM.md) when comparing live output.

---

## 10. Coverage tags

Tag for [GOLD_PACK_COVERAGE_TARGETS.md](./GOLD_PACK_COVERAGE_TARGETS.md):

- [ ] Phone attribution
- [ ] CCTV / stills / master footage
- [ ] BWV / bodycam
- [ ] Custody / PACE / interview
- [ ] Drugs continuity / lab / weight
- [ ] Encro / handle attribution
- [ ] Motoring / SJP / device calibration
- [ ] Youth / YJS / safeguards
- [ ] Domestic / stalking / course of conduct
- [ ] ABE / first account / third-party records
- [ ] Co-defendant / mixed defendant
- [ ] Fraud / bank / device ownership
- [ ] Expert: DNA / fingerprint / cell-site / medical
- [ ] Bail / restraining / non-mol / DVPO
- [ ] OCR / layout / redaction / date / court mismatch
