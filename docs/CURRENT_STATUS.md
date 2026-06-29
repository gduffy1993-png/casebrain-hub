# CaseBrain criminal pilot — where we are

**Updated:** 2026-06-29  
**Prod:** [https://www.casebrain.co.uk](https://www.casebrain.co.uk) — **`master`** (`1687a52`) · H5 workstation **complete** · prod smoke **20 pass / 1 warn / 0 fail**

**Claims discipline:** Controlled gates below are green on **known** corpora (2,200, golden 102, simulator 150, Bad Output Memory, export/copy, deploy smoke). **Do not claim** near-zero false-served or industry-level evidence-state accuracy on **unseen real-world bundles** until the Evidence-State Accuracy Audit harness has been run on independent truth keys — see `docs/audit/EVIDENCE_STATE_ACCURACY_AUDIT.md`.

### Production deploy alignment (ops)

| Setting | Value |
|---------|--------|
| GitHub default branch | `master` |
| Vercel production branch | **`master`** (was `main` — fixed 2026-06-29) |
| `main` branch | Stale / diverged (~61 commits behind `master`) — **do not ship from `main`** |
| Custom domain auto-assign | On |

**Symptom before fix:** green Vercel checks on `master` only built **Preview**; `www.casebrain.co.uk` stayed on old `main` or manual CLI deploys.  
**Verify after any prod push:** `vercel inspect www.casebrain.co.uk` → `meta.githubCommitRef` = `master`, SHA matches `git rev-parse master`.

**Decision:** No design-partner trial yet. H3 ✅ · H4 ✅ · **H5 ✅** → **Evidence-State Accuracy Audit Harness** (next) → firm rollout.

**Scale gates (controlled proof — not a substitute for unseen-bundle audit):** golden 102 + Level 1 2,200 + worst50 + simulator 150 + Bad Output Memory + export/copy + prod smoke. **Taylor/Jordan:** fresh-user deploy smoke only.

## Done

| Item | Result |
|------|--------|
| H1 — safety / weirdness | Done — 2,200 clean |
| H2 — display polish + verification | Done — golden 102, 0 fail |
| Modules 1–7 | Live |
| H3 chunks 1–3 | Prod — trust layer **complete** |
| Brain 1 + frozen cores | Untouched |

### H3 accepted complete

- Chunks 1–3 deployed (`895a905` · `f3703a2` · `4735efa`)
- CB-FRESH smoke **9/9 PASS**
- Golden 102 H3 trust gate: **0 blocking / 0 confusing**
- Feedback panels live on Today / Chase / Summary
- Trust feedback DB migration applied (`20260628120000_trust_feedback.sql`)

## H4 — Real-World Confidence ✅ **complete**

**Criminal Bundle Simulator Library** — fake/anonymised bundles; test by shape, not identity.

| Step | Work | Status |
|------|------|--------|
| 1 | Trust feedback DB migration | ✅ Applied + verified |
| 2 | Export/copy gate | ✅ Golden 102 — 0 blocking |
| 3 | Fresh-account smoke (ongoing) | ✅ |
| 4 | Account/permission smoke | ✅ prod — 25 pass / 0 fail / 2 warn (Today panel timing) |
| 5 | Simulator manifest v1 — 30 cases | ✅ locked |
| 6 | Simulator pack v1 | ✅ gate 0 blocking |
| 6b | v1.1 serious-case supplement | ✅ accepted — 7 cases, gate 0 blocking |
| 7 | Expand 37 → 75 → 150+ | ✅ v2 ingested — combined gate 0 blocking |
| 8 | Worst50 + simulator → Bad Output Memory | ✅ 23 blocking rules · gate PASS |
| 9 | Expand simulator **75 → 150** | ✅ combined gate 0 blocking |

**Simulator library:** **150 cases** (v1 30 + v1.1 7 + v2 38 + v3 75) · combined gate **0 blocking** · warnings = chase-label / Today phrasing drift

**Scale gates (latest):** simulator 150 **0 blocking** · Bad Output Memory **PASS** · export/copy golden 102 **PASS** · golden trust **PASS**

### H5 chunk 1 — Five Answers front door ✅

| Item | Status |
|------|--------|
| `buildFiveAnswersView` + evidence two-axis trace | ✅ |
| `FiveAnswersView` — 5 answers, hard rules, contradiction surface | ✅ |
| Pilot default tab → **Overview** (`?tab=overview`) | ✅ |
| Today / Chase / Summary / Papers unchanged underneath | ✅ |
| Overview smoke | `scripts/h5-overview-smoke.ts` |
| Layer 7 artifact | `scripts/h5-five-answers-artifact.ts` |

### H5 chunk 2 — Evidence Trace proper ✅

| Item | Status |
|------|--------|
| `buildEvidenceTrace` — allegation, evidence, missing/referred, DNO, chase, court note | ✅ |
| Expandable trace panel per Five Answers card | ✅ |
| Both axes + inference / critical / not-usable labels | ✅ |
| Contradictions as trace warnings (existing detection only) | ✅ |
| Overview preview smoke | `scripts/h5-overview-smoke.ts` — 9/9 PASS (local) |

### H5 chunk 3 — Defence Decision Board ✅

| Item | Status |
|------|--------|
| `buildDecisionBoard` — source gaps + contradictions → review options | ✅ |
| `DefenceDecisionBoard` on Overview (below Five Answers) | ✅ |
| Hard wording guard (no win/collapse language) | ✅ |
| `scripts/decision-board.test.ts` | ✅ |

### H5 chunk 4 — Advice Change Radar ✅

| Item | Status |
|------|--------|
| `buildAdviceChangeRadar` — material change + watch points from snapshot compare | ✅ |
| `buildMatterEvidenceSnapshot` — matter-brief baseline without reasoning-v2 | ✅ |
| `AdviceChangeRadarPanel` on Overview (below Decision Board) | ✅ |
| Hard wording guard (review needed because… — no command language) | ✅ |
| `scripts/advice-change-radar.test.ts` | ✅ |

### H5 chunks 1–4 — prod acceptance ✅

| Item | Status |
|------|--------|
| Fresh upload → Overview (`?tab=overview&controlRoom=1`) | ✅ prod |
| Five Answers + Evidence Trace + Decision Board + Advice Change Radar | ✅ prod |
| `scripts/h5-overview-smoke.ts` vs `www.casebrain.co.uk` | ✅ **20 pass / 1 warn / 0 fail** (2026-06-29, `1687a52`) |

### H5 workstation — **complete** ✅

| Slice | Status | Commit area |
|-------|--------|-------------|
| Five Answers | ✅ prod | chunk 1 |
| Evidence Trace | ✅ prod | chunk 2 |
| Defence Decision Board | ✅ prod | chunk 3 |
| Advice Change Radar | ✅ prod | chunk 4 |
| 20-Minute Hearing Mode | ✅ prod | H5 chunk 5 |
| Export Pack | ✅ prod | `9fd5e9c` |
| Feedback Console | ✅ prod | `fe047ea` |
| Audit Log (read-only) | ✅ prod | `cba606c` |
| Re-run Diff (localStorage baseline) | ✅ prod | `5d26071` |
| Confidence Dashboard | ✅ prod | `1687a52` |

**Prod smoke (latest):** `scripts/h5-overview-smoke.ts` → **20 pass / 1 warn / 0 fail** — Taylor upload, Overview panels, Today/Chase/Summary, mobile layout. Warn: feedback console flag testid timing (non-blocking).

**Next phase:** **Evidence-State Accuracy Audit Harness** — truth-key comparison on controlled fixtures (not real-world solicitor audit).

**Not shipped (local only):** Proof Review page (`/proof-review`) — internal/labs; commit pending.

## Evidence-State Accuracy Audit — **next** ⏳

**Status:** Spec locked (`docs/audit/EVIDENCE_STATE_ACCURACY_AUDIT.md`). **Harness build in progress** — controlled/simulator fixtures only.

| Item | Status |
|------|--------|
| Spec | `docs/audit/EVIDENCE_STATE_ACCURACY_AUDIT.md` |
| Core metric | False-served rate (dangerous failure mode) |
| Stage 1 target | 30–50 unseen/anonymised bundles (internal prep) |
| Placement | After H5 complete · before 3–5 firm rollout |
| Near-zero false-served on real unseen bundles | **Not claimed** — real-world audit not run |

**Controlled proof (separate):** 2,200 corpus · golden 102 · simulator 150 · Bad Output Memory · export/copy · prod smoke — green on controlled sets only.

## Key scripts

```powershell
npx tsx scripts/h3-golden-trust-gate.ts
npx tsx scripts/h4-export-copy-gate.ts
npx tsx scripts/h4-account-permission-smoke.ts
npx tsx scripts/build-simulator-manifest-v1.ts
npx tsx scripts/simulator-manifest-v1.test.ts
npx tsx scripts/h4-simulator-pack-v1-generate.ts
npx tsx scripts/h4-simulator-pack-v1-gate.ts
npx tsx scripts/build-simulator-manifest-v1.1.ts
npx tsx scripts/h4-simulator-pack-v1.1-generate.ts
npx tsx scripts/h4-simulator-pack-v1.1-gate.ts
npx tsx scripts/build-simulator-manifest-v2.ts
npx tsx scripts/h4-simulator-pack-v2-generate.ts
npx tsx scripts/h4-simulator-pack-v2-gate.ts
npx tsx scripts/h4-simulator-combined-gate.ts
npx tsx scripts/build-simulator-manifest-v3.ts
npx tsx scripts/h4-simulator-pack-v3-generate.ts
npx tsx scripts/h4-bad-output-memory-gate.ts
npx tsx scripts/five-answers-view.test.ts
npx tsx scripts/evidence-trace.test.ts
npx tsx scripts/decision-board.test.ts
npx tsx scripts/advice-change-radar.test.ts
npx tsx scripts/h5-five-answers-artifact.ts
npx tsx scripts/h5-overview-smoke.ts   # local preview / prod after deploy
npx tsx scripts/rerun-diff.test.ts
npx tsx scripts/confidence-dashboard.test.ts
npx tsx scripts/audit-log.test.ts
npx tsx scripts/evidence-state-audit.test.ts   # harness (when present)
npx tsx scripts/bad-output-memory.test.ts
npx tsx scripts/trust-feedback-persistence-verify.ts
npx tsx scripts/golden-case-pack-gate.ts --pack gold --min-runnable 100 --max-polish-rate 1
npx tsx scripts/trust-feedback.test.ts
npx tsx scripts/.tmp-cb-fresh-audit.ts   # deploy smoke only
```
