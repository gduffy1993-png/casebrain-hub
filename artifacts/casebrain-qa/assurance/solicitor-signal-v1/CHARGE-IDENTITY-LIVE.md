# Charge identity — LIVE proof (Hale class)

Captured: 2026-08-25 · PR #101 only (no merge, no production deploy)

| Tip | Preview | Result |
|-----|---------|--------|
| `a96538d3f` (Codex charge outrank) | `casebrain-nud9hh0a9` | **Build ERROR** — never deployed |
| `38620095a` (compile fix) | `casebrain-knmzc44x1` | Ready — Hale Overview **still Fraud** |
| `a93b8336b` (demo-name root fix) | `casebrain-fhlp2uwuj` | **Hale Overview = Murder** |

## What the live evidence showed

Codex's patch targeted "source-backed charge outranks stale structured matter offence". That layer
was not the live cause:

- `caseMetadata.offenceDisplay` for Hale was **already** `Murder, contrary to common law`
- `matter.allegedOffence` was **null** — there was no stale matter offence to outrank
- so `resolveCaseHeaderMetadata` was already returning Murder

The Fraud label was applied **after** header resolution, by `workflowHeaderOverrides` in
`lib/criminal/pilot-workflow.ts`.

### Root cause

`DEMO_TITLE_FALLBACK` matched demo matter names against `contextScan`, which includes
`bundleText` (Hale's front-matter scan is 80,000 chars). Hale's murder papers name
**Marcus Vale** as a person in the evidence:

> `BloodSays blood from struggle/checking Marcus` … `Marcus phone is incomplete`

Probe confirmed `marcusVale: true` for Hale and `false` for Tobin / Davies / Patel / Arden.

Matching that name hard-overrode three things at once:

| Field | Demo value forced |
|-------|-------------------|
| title | `R v Marcus Vale` |
| allegation | `Fraud by false representation` |
| profile | `fraud_account_control` |

The forced profile is also what produced the fraud court line
(`Account-control and dishonesty issues remain conditional on served phone/device material.`)
on a murder file — so the wrong charge and the wrong court line were one bug, not two.

### Fix shipped (`a93b8336b`)

- Demo matter names now match on **case identity only** (`caseTitle`, `clientLabel`) via
  `demoIdentityScan` / `demoMatchFromIdentity`. A demo name appearing inside served evidence
  (witness, complainant, exhibit note) can no longer set the matter's identity.
- Applied at all three demo-match sites: `resolveDemoProfileFromContext`, `scoreProfile`
  demo weighting, and `workflowHeaderOverrides`.
- Demo pack allegation no longer overrides a usable source-backed charge.

## Live board after fix (Preview `casebrain-fhlp2uwuj`)

| Case | Charge shown | Attention | Case-wide court line | Verdict |
|------|--------------|-----------|----------------------|---------|
| **Leon Hale** `14823d9e` | **Murder, contrary to common law** | 0 missing · 2 incomplete · 2 review | Serious violence — provisional | **FIXED** (was Fraud + dishonesty line) |
| Imani Tobin `a42cb20a` | Wounding with intent, s.18 OAPA 1861 | 0 · 3 · 3 | custody/PACE + interview | unchanged — no regression |
| Layla Davies `687cf5a6` | Concealing criminal property, s.327 POCA | 0 · 3 · 3 | custody/PACE + interview | unchanged — no regression |
| Isaac Patel `ed3c9806` | Affray, s.3 POA 1986 | 0 · 4 · 4 | custody/PACE + interview | unchanged — no regression |
| Arden Vale `99090c69` | Robbery | 0 · 2 · 2 | identification / CCTV | unchanged — no regression |

Client-safe summary on Hale also now reads Murder, not Fraud.

## Contracts

- `scripts/source-truth-guardian.test.ts` — **23 PASS**, including four new demo-name cases:
  demo name in evidence must not rewrite charge; must not force fraud profile/court line;
  demo pack still applies on real demo identity; source charge beats demo label.
- `npx tsc --noEmit -p tsconfig.build.json` — **clean** (takes ~2 min; it was not hanging).
- PASS: `solicitor-shortlist-freeze`, `demo-overview-adapter`, `cps-chase-review-status`,
  `live-ui-wording-regression`, `pilot-workflow-profile`, `chase-source-gate`,
  `bundle-shape-regression`, `pilot-case-visibility`, `murder-bundle-metadata-extract`,
  `proof-map-product`.
- Pre-existing unrelated failure (confirmed on clean tree, not caused here):
  `scripts/client-summary-compose-quality.test.ts` — `sanitizeSolicitorProse`
  "Further papers appear to be outstanding" wording assertion.

## Still open (from BAD-OUTPUT-EVIDENCE-REPORT.md)

Unchanged by this root — next in order:

1. **Papers WRONG_STATUS** — Davies MG6/04 bank statements Outstanding shown as Served; Arden 0-served.
2. **Schedule-loud gap ranking** — Hale desk is still interview + medical while CCTV master, BWV,
   fingerprints and final MG11 are the loud MG6 gaps; Tobin/Davies/Patel same class.
3. **Court-line binding** — Tobin/Davies/Patel still show the custody/PACE line while a different
   item is selected.
4. Cosmetic: Davies charge label carries a `Primary charge:` prefix from the extract.
