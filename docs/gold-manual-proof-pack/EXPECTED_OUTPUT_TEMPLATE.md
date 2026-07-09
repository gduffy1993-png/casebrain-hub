# Expected Output — Template

**Case ID:** `gm-XXX-short-label`  
**Linked truth state:** `truth-state.json`  
**Review type:** gold manual review on a controlled bundle — solicitor review required.

Use this template after manually reading the bundle. Record **expected** CaseBrain behaviour, not actual run output. Do not invent solicitor quotes or claim outputs have been solicitor-approved in production.

---

## How to use

1. Complete truth state first.
2. Draft expected lines per surface in plain, solicitor-readable language.
3. Mark each line: **must appear**, **may appear**, or **must not appear**.
4. Attach source/page expectation for every **must appear** line.
5. Compare against a CaseBrain run separately; record gaps in the false-positive form.

---

## 1. Expected missing material

What the matter should surface as missing, partial, or referred-but-absent.

| # | Gap description | Must / may / must not | Truth state link | Chase? (Y/N) |
|---|-----------------|----------------------|------------------|--------------|
| 1 | | must | `materials[].id` | |
| 2 | | | | |

**Must not appear as missing:**

| Material | Reason |
|----------|--------|
| | Already served — see source below |

---

## 2. Expected unsafe-to-say warnings

Warnings or provisional wording CaseBrain should show before a line is treated as reliable.

| # | Subject | Expected warning (paraphrase) | Must / may / must not | If bundle supports stronger wording, note why still provisional |
|---|---------|------------------------------|----------------------|----------------------------------------------------------------|
| 1 | Identification | | must | |
| 2 | Phone / Encro attribution | | | |
| 3 | Drug weight / purity | | | |
| 4 | Intent / knowledge | | | |
| 5 | Medical / injury outcome | | | |
| 6 | Device / account ownership | | | |
| 7 | Timeline / sequence | | | |

---

## 3. Expected court line

Hearing-safe lines suitable for court-facing export. No plea advice. No guilt inference.

| # | Expected line (paraphrase) | Must / may / must not | Tone | Source / page |
|---|---------------------------|----------------------|------|---------------|
| 1 | | must | neutral / provisional | |
| 2 | | | | |

**Must not appear on court surface:**

| Line (paraphrase) | Why inappropriate |
|-------------------|-------------------|
| | e.g. client-only phrasing, chase language, un sourced assertion |

---

## 4. Expected CPS chase

Disclosure chase items proportionate to the bundle and stage.

| # | Expected chase item (paraphrase) | Must / may / must not | Priority | Grounds (brief) |
|---|----------------------------------|----------------------|----------|-----------------|
| 1 | | must | H/M/L | |
| 2 | | | | |

**Must not appear in chase:**

| Chase item | Why unnecessary or wrong |
|------------|--------------------------|
| | e.g. duplicate of served material, wrong stage, wrong recipient surface |

**Chase discipline checks:**

- [ ] No chase for material already served in bundle
- [ ] No duplicate requests phrased differently
- [ ] No client-facing phrasing on CPS chase
- [ ] Referred-but-absent distinguished from not-in-bundle

---

## 5. Expected client summary

Plain-English summary for the client. Calibrated confidence. No legal advice.

| # | Expected point (paraphrase) | Must / may / must not | Confidence | Source / page |
|---|----------------------------|----------------------|------------|---------------|
| 1 | | must | low / medium | |
| 2 | | | | |

**Must not appear in client summary:**

| Point | Why |
|-------|-----|
| | e.g. CPS chase wording, technical exhibit refs without explanation, certainty beyond bundle |

---

## 6. Expected proof receipt

Per-line provenance and safe-action expectations for the Proof Receipt surface.

| # | Output line (paraphrase) | Surface | Must link source? | Expected source | Page / anchor | Safe action expected |
|---|-------------------------|---------|-------------------|-----------------|---------------|---------------------|
| 1 | | court / chase / client | Y | MG5 | p. __ | review / chase / hold |
| 2 | | | | | | |

**Receipt discipline checks:**

- [ ] Every **must appear** output line has a receipt row or explicit "no source — provisional" flag
- [ ] Partial material marked as partial, not present
- [ ] Referred-absent distinguished from not-in-bundle in receipt copy
- [ ] No receipt row implies solicitor sign-off

---

## 7. Source / page expectation matrix

Cross-surface map from bundle locations to outputs.

| Bundle location | Document | Pages | Supports which outputs | Excerpt note (optional) |
|---------------|----------|-------|------------------------|-------------------------|
| | MG5 | | court line 1, client 1 | |
| | MG11 | | court line 2 | |
| | MG6 item 4 | | missing material 1, chase 1 | exhibit referred, not attached |
| | Schedule / index | | receipt anchor | |

---

## 8. Surface split expectations

Where the same underlying fact should be worded differently per channel.

| Fact (neutral) | Court | CPS chase | Client | Must differ? (Y/N) |
|----------------|-------|-----------|--------|-------------------|
| CCTV partial clip served; master absent | | | | Y |
| | | | | |

---

## 9. Reviewer notes (expected output)

| Date | Reviewer role | Note |
|------|---------------|------|
| | | Initial expected output drafted from controlled bundle read |

**Open issues:**

- 

**Do not record fabricated run results or solicitor endorsements here.**

---

## 10. Comparison snapshot (fill after run)

Record actual vs expected at review time. Use pass / partial / fail per row.

| Section | Expected count (must) | Matched | Partial | Missed | Over-generated |
|---------|----------------------|---------|---------|--------|----------------|
| Missing material | | | | | |
| Unsafe-to-say | | | | | |
| Court line | | | | | |
| CPS chase | | | | | |
| Client summary | | | | | |
| Proof receipt | | | | | |

Detailed false-positive notes: [FALSE_POSITIVE_REVIEW_FORM.md](./FALSE_POSITIVE_REVIEW_FORM.md).
