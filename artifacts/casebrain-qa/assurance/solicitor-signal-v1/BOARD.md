# Solicitor-signal v1 — LIVE board

Generated: 2026-08-24
Branch: `ui/demo-overview-shell-v1`
Tip before fix: `0177ba66d`
Fix SHA: `f48f1f413`
Preview AFTER: https://casebrain-q3lhtyih7-gduffy1993-pngs-projects.vercel.app
Preview BEFORE lick: https://casebrain-l8dqkfmm0-gduffy1993-pngs-projects.vercel.app

## Mandate

Live-check UI (not audit boards). Hunt unnecessary/confusing outputs. Bias to what a defence solicitor actually needs. Prefer mute/collapse over more polish. Invent-mute stays closed.

## Cases licked LIVE (13 before / 8 after)

| Case | ID | Before open-review | After open-review | Verdict |
|------|----|--------------------|-------------------|---------|
| Brookes | `2dcdc59d-…` | 3 (phone + exhibit + digital schedule) | **1** (phone only) | PASS |
| Dunn | `a81a0cf3-…` | 4 (CAD + custody + exhibit + MG6) | **2** (CAD + custody) | PASS |
| Ahmed | `ba22e8bb-…` | 6 (incl. 2× digital schedule) | **4** (CAD/custody/transcript/medical) | PASS |
| Grant | `e2841289-…` | 2 (phone + digital schedule) | **1** (phone) | PASS |
| Arden | `99090c69-…` | 4 (2× CCTV + exhibit + MG6) | **2** (CCTV continuity + master) | PASS |
| Tobin | `a42cb20a-…` | 5 | **3** | PASS |
| Priya Vale | `f57a2750-…` | 4 (heavy MG6 noise) | **1** | PASS |
| Patel LIVE | `ed3c9806-…` | licked after only | — | sampled |
| Hale / Reed / Patterson / Vale / Leon Hale | various | before only | — | inventory only |

**Trap** (`ce5bc9f2-…`): **not on QA account list** this Preview — not re-licked.

Inventory: 23 cases on QA account (`QA-ACCOUNT-CASE-LIST.json`).

## Ranked noise patterns (cross-case)

1. **P0 — Generic exhibit mapping / provenance** — UNCLEAR + “Source status needs confirming…” on nearly every brief. Solicitors do not need a kitchen-sink provenance card when real gaps exist.
2. **P0 — MG6 / unused schedule clarification** (and polish rename **digital disclosure schedule item**) — schedule meta crowding phone/CCTV/interview gaps; Ahmed had **duplicate** digital schedule rows.
3. **P1 — Attention pile-on** — 4–6 open-review rows when 1–2 solicitor-critical gaps would do (“brain working too much at once”).
4. **P2 — Chase overflow dump** — “Additional source-material issues (13 on file)” + wrong MG6 draft under MG11 detail (Dunn residual).
5. **P2 — Soft readiness %** — vanity projection; not solicitor-critical (left alone this pass).
6. **Invent** — no invent regression chased; invent-mute lane stays closed.

## Tags (solicitor lens)

| Surface | KEEP | NOISE (muted) | WRONG / residual |
|---------|------|---------------|------------------|
| Overview attention | Charge, listing, phone/CCTV/interview/CAD/custody when real | Exhibit mapping, MG6/digital schedule clutter | Chip Missing/Incomplete can still disagree with attention length (Brookes 2 missing chip vs 1 row) |
| Chase primary | Same KEEP families | Clutter demoted under “Other source-material items” | Overflow “13 on file” chrome + mis-bound MG6 draft on Dunn MG11 detail |
| Court / Papers | Not the fix target | — | Trap absent |

## Fix (shared-root)

- `lib/criminal/solicitor-signal-mute.ts` — `isGenericSolicitorClutterLabel` / `demoteSolicitorClutter` / title dedupe
- `demoOverviewAdapter.ts` + `DemoOverviewView.tsx` — mute after build + after polish rename
- `buildDisclosureChaseBrief.ts` `splitPrimaryAdditional` — demote clutter off primary Chase board (kept under Other)
- Tests: `scripts/solicitor-signal-mute.test.ts`, extended `demo-overview-adapter.test.ts`

## Before → After examples (LIVE text)

**Brookes Overview**
- BEFORE: Exhibit mapping · Phone extraction · digital disclosure schedule item
- AFTER: Phone extraction/download status only

**Arden Overview**
- BEFORE: CCTV continuity · CCTV master · Exhibit mapping · MG6 clarification
- AFTER: CCTV continuity · CCTV master only

**Dunn Chase**
- BEFORE: CAD · custody · Exhibit mapping · Complainant MG11 (+ MG6 in attention)
- AFTER primary: CAD · custody · Other source-material items (2) collapsed

## Residual (honest)

- Not all 23 cases re-licked after deploy (8 AFTER).
- Trap not available on this Preview account.
- Dunn detail panel still dumps merged-file chrome / MG6 draft under MG11 — next mute if needed.
- Overview count chips vs attention list can still diverge (evidence counts vs muted attention).
- Soft Case Readiness % still on screen.
- Invent-mute not reopened.

## PASS / FAIL

- Local contracts: **PASS** (mute, overview adapter, chase finalize, cps-chase-review, demo polish)
- Live solicitor-signal (licked set): **PASS** for clutter mute
- All-cases PASS: **NO** — only N licked live
