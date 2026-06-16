# Criminal pilot — master plan (merged)

**Status:** Layers 1–3 implemented locally. Brains unchanged.

## Principle

**Same information, simpler shell.** Extraction, chase briefs, control room reasoning, and factory rules are not modified by layout work.

## Layer 1 — Paper trust

| Item | Status |
|------|--------|
| Chaos factory CB-TB 1–2200 | Done — 0 fail |
| Foundation S1–S6 PDFs | Done — 6 pass factory |
| Foundation M1 (date conflict) | Done — amber expected |
| M2–M5, B1–B4 recipes | Docs only |
| Local extract smoke | `scripts/foundation-pilot-extract-smoke.ts` |

## Layer 2 — Case layout

| Item | Status |
|------|--------|
| Today · Papers · File zones | Done |
| Sticky header strip + bail/funding/safeguard badges | Done |
| Court Today → Today tab | Done |
| Pilot sidebar trimmed | Done |

### Zone map

| Zone | Content |
|------|---------|
| **Today** | Hearing War Room (unchanged) |
| **Papers** | Control Room (unchanged) |
| **File** | Documents + hearing outcome + client vs papers + deadlines + client recorder |

## Layer 3 — Solicitor day

| Item | Status |
|------|--------|
| IDPC shape sheet | `shapes/10-idpc-common-platform-pack.md` |
| Hearing outcome note | File tab — `HearingOutcomeNote` |
| Client vs papers | File tab — `ClientVsPapersPanel` |
| Deadline diary | File tab — `PilotDeadlinesPanel` |
| Funding/bail/safeguard header | Matter API on strip |

## Layer 4 — Pilot hardening (next)

- Browser cold-start on S1 upload
- No tracker/demo leakage QA
- Paywall/trial clarity
- Real redacted matters (with consent, after synthetic pilot)

## Out of scope

- Real client data / live listings
- Training model on bundles
- Legal advice / compliance certification
