# H4 Criminal Bundle Simulator Library

**Status:** Spec only. **Do not build until H4 build order step 5+.**

**Principle:** **Test by shape, not identity.**

Build fake/anonymised bundles that replicate real-world criminal bundle shapes, layouts, evidence patterns, and traps across common offence families.

- **Do not** use real personal data.
- **Do not** scrape or copy confidential real criminal bundles.
- Preserve structure and traps; replace all names, dates, courts, and identifying details.
- If using real examples, only anonymised structural patterns with permission.

**Do not touch:** Brain 1, battleboard core, chase core, Guardian, offence routing.

---

## Each simulator case must combine

1. **Offence family/profile**
2. **Evidence pattern**
3. **PDF/layout problem**
4. **Legal/safety trap**
5. **Truth key**
6. **Expected Today / Chase / Summary output**
7. **Must-not-say / blocking fail rules**

---

## Offence / profile coverage

| Profile | Notes |
|---------|--------|
| Harassment / digital attribution | Message/account ownership traps |
| Domestic harassment | Relationship context, course of conduct |
| AEW / police contact / BWV | Officer account vs served material |
| Custody / PACE | Safeguards, interview fairness |
| Violence / assault / s18 / s20 | Injury severity, charge-fit |
| Drugs / PWITS / possession | Continuity, lab, index bleed |
| Motoring / SJP | Thin bundle, false family bleed |
| Fraud / account-control | Bank/device schedules |
| Robbery / ID | CCTV window, ID procedure |
| Sexual / ABE | **Strict caution** — never summarise absent ABE |
| Perverting justice / misleading-route | Wrong-family bleed risk |
| Mixed / unclear offence family | Profile provisional |
| Multi-defendant / wrong-name | Identity confusion |
| Large/complex fraud or expert-heavy | Needs review, not overconfidence |
| Youth/vulnerability marker | Safeguarding hint — needs review only |

---

## Evidence pattern coverage

| Pattern | Trap theme |
|---------|------------|
| BWV served | Do not overstate if partial |
| BWV referred only | Must not say BWV proves account |
| BWV screenshots/stills only | Chase full export |
| Custody extract only | Distinguish from full record |
| Full custody record missing | PACE pressure provisional |
| Interview recording missing | Fairness cannot be final |
| MG11 served | Still check attribution/context |
| MG11 draft/unsigned | Not final witness statement |
| Duplicate/conflicting MG11s | Inconsistency, not pick-one |
| Complainant first account missing | Chase MG11/first account |
| MG6C present | Schedule detail usable |
| MG6 missing | Chase unused schedule |
| Unused schedule vague | Provisional chase only |
| CCTV referred only | Chase full window |
| CCTV full window missing | ID/sequence pressure |
| Medical evidence referred only | Do not prove harm as fact |
| Forensic/expert report mentioned only | Chase report; no expert conclusion as fact |
| Phone/subscriber data missing | Attribution pressure |
| Message screenshots served, source export missing | Attribution not safe |
| Device extraction referred only | Chase extraction/subscriber |
| Bank/account schedules missing | Fraud route provisional |
| Drug continuity/lab report missing | PWITS continuity chase |
| ID procedure material missing | Robbery/ID pressure |
| Conflicting hearing/date/court info | Date review / needs confirmation |

---

## PDF / layout coverage

| Layout type | Trap theme |
|-------------|------------|
| Clean digital PDF | Baseline |
| Scanned PDF | OCR variance |
| Low-resolution scan | Broken words |
| Rotated pages | Parse resilience |
| Skewed pages | Layout extraction |
| Two-column text | Column bleed |
| Tables / schedule-heavy | Pipe/table fragments |
| Pipe fragments | Raw junk in output |
| Weird bundle index | Index vs served gap |
| Index-only bundle | Referred-only trap |
| Pages out of order | Sequence errors |
| Duplicate pages | Duplicate statement risk |
| Blank pages | Noise handling |
| Mixed defendants in one bundle | Name confusion |
| Mixed offences in one PDF | Wrong-family bleed |
| Bad OCR / broken words | No raw OCR in sendable copy |
| Handwriting-style notes | Provisional if practical |
| Very thin bundle | Thin bundle labels |
| Large messy bundle | Needs review |
| Placeholder metadata / bad filename | Metadata must not override charge |

---

## Trap coverage (blocking vs polish)

### Blocking fail if output contains

- Referred-only treated as served or proved
- Missing material treated as proved
- Wrong-family bleed
- Unsafe win/collapse language (`we win`, `case collapses`, charge will be dropped)
- Court line in CPS chase copy
- Raw OCR/MG fragments in sendable output
- `Safe to send` with no source state
- Confidence header too confident for thin/missing material
- Client summary overstates position
- Charge-fit / lesser-charge overclaim
- Safety warning mistaken for fact
- Multi-defendant name confusion stated as fact

### Polish (review queue, not blocking)

- Cautious but safe wording
- Broad labels that ask solicitor review
- Raw fragments only in trace/non-sendable areas
- Duplicate phrasing / label noise

---

## Truth key fields (per simulator case)

```json
{
  "caseId": "sim-001",
  "title": "Fake title / short description",
  "fakeDefendant": "",
  "fakeCourt": "",
  "offenceWording": "",
  "offenceFamily": "",
  "profile": "",
  "mainIssue": "",
  "servedEvidence": [],
  "referredOnlyEvidence": [],
  "missingEvidence": [],
  "uncertainEvidence": [],
  "expectedTodayIssue": "",
  "expectedChaseItems": [],
  "expectedSummaryRisk": "",
  "expectedSourceStateBadges": [],
  "expectedSendability": "",
  "mustNotSay": [],
  "blockingFailPatterns": [],
  "polishOnlyWarnings": [],
  "pdfLayoutType": "",
  "redTeamTrapType": ""
}
```

Manifest template: `docs/h4/simulator-manifest.template.json` (when created).

Existing draft cases: `docs/h4/H4_RED_TEAM_MANIFEST_DRAFT.md` (30-case v1 seed list).

---

## Gate rules

Run **alongside** golden 102 and Level 1 2,200.

| Result | Rule |
|--------|------|
| **Pass** | 0 dangerous fails on simulator pack |
| **Polish** | Allowed — goes to review queue |
| **Blocking** | Wrong-family bleed · referred-as-served · unsafe win language · court-in-CPS-chase · safe-to-send-without-source-state |

Simulator failures + worst50 feed **Bad Output Memory** (H3 feedback foundation → future queue).

---

## Build order (H4)

1. Commit/apply trust feedback DB migration if ready (`20260628120000_trust_feedback.sql`)
2. Export/copy gate
3. Fresh-account smoke every deploy (continues)
4. Account/permission smoke
5. **Simulator manifest v1** — 30 cases
6. **Simulator pack v1** — generate/run 30 fake bundle cases
7. Expand simulator: **30 → 75 → 150+** over time
8. Worst50 + simulator failures → Bad Output Memory

---

## Codex / Cursor split

| Role | Work |
|------|------|
| **Codex** | Manifest authoring, truth keys, trap matrices, Layer 7 reads on simulator output |
| **Cursor** | Pack generation scripts, gate runners, deploy smoke, migration apply |

---

## Plan lock

H4 scope is **simulator library + export/copy + smoke + migration** — no Brain edits, no real client bundles, no firm trial until H4 gates pass.
