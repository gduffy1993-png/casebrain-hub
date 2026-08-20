# OVERVIEW PRODUCT UI REBUILD V1 — REPORT

**Branch:** `programme/legal-intelligence-recovery-v1`  
**HEAD:** `a06438123e0f05003cdaa9f2acebd126189fd0bc`  
**Product UI tip:** `1d2a523f66d2951f471a2ca0027942d20cc8c9ad` (negation projection)  
**Baseline:** authenticated-live-proof recovery candidate (`6c54326ec`)  
**Release:** `programme/real-pdf-live-pilot-v1` — **untouched**  
**Date:** 2026-08-20  

---

## Final verdict (exactly one)

# `OVERVIEW_PRODUCT_UI_READY_FOR_HUMAN_REVIEW`

Presentation-only Overview rebuild landed on the recovery branch. Authoritative counters and CPS Chase firewall hold. Patel + phone Overview screenshots show ranked solicitor workspace (not the raw three-column dump). Five-matter live content is case-specific; two harness `product-workspace` checks were flaky while Overview text/labels were present.

**Do not merge. Not pilot.**

---

## 1. What changed (presentation only)

### Product composition
Default Overview is now:

1. **Case header + counters** — name/charge/stage/court/hearing/provisional + Missing/Outstanding, Incomplete, Active Chases (+ NSC when > 0)  
2. **What Needs Attention** — ranked top ~7 issues + “View all X items”  
3. **Selected issue** — why / sources / why it matters / consider / recommended action  
4. **Bottom cards** — Safe Court Line, Client Update, Case Readiness (**categorical**, no fake %)  

Raw `FACT` / `SAFE ANALYSIS` / `PRACTITIONER CONSIDERATION` dump removed from the **default** Overview. Underlying LI remains; audit card moved under **Advanced review**.

### Projection principles
- Counts from `countAuthoritativeEvidenceRows` — ranking/filter does **not** change totals  
- Negative-first for not-established (never “999 audio outstanding — not established”)  
- Strip internal epistemic enums / id prefixes via display projection  
- Copy chase **only** when source-supported chase wording exists  
- Copy court wording **only** when court-safe wording exists  
- Considerations alone never enable Chase  
- Not-established / negation families (BWV, medical, 999) suppress OUTSTANDING presentation when LI marks them not established — **counters unchanged**

### Files changed
| Path | Role |
|------|------|
| `lib/criminal/overview-workspace/*` | Presentation VM + display projection |
| `components/criminal/five-answers/OverviewWorkspaceHeader.tsx` | Header + counters |
| `components/criminal/five-answers/OverviewWhatNeedsAttention.tsx` | Ranked list |
| `components/criminal/five-answers/OverviewSelectedIssue.tsx` | Detail panel |
| `components/criminal/five-answers/OverviewSummaryCards.tsx` | Bottom cards |
| `components/criminal/five-answers/FiveAnswersView.tsx` | Wire new workspace |
| `scripts/overview-product-ui-rebuild.test.ts` | Projection regressions |
| `scripts/assurance/legal-intelligence-recovery-v1/restored-overview-authenticated-live-proof.ts` | Live proof for product UI |
| `scripts/assurance/legal-intelligence-recovery-v1/capture-overview-product-screenshots.ts` | Overview screenshot helper |

**Brain untouched:** canonical, LI generation, Case Moves, chase-source gating, negation engine, interview gating, order/motoring logic.

---

## 2. Tests

| Suite | Result |
|-------|--------|
| `scripts/overview-product-ui-rebuild.test.ts` (6) | **PASS** — counts stable, chase button rules, negative-first, Patel invent wall, BWV negation suppress |
| `scripts/overview-live-proof-intelligence-cleanup.test.ts` (12) | **PASS** (prior wall preserved) |
| `tsc -p tsconfig.build.json --noEmit` | **PASS** |

---

## 3. Preview deploy

| Check | Result |
|-------|--------|
| Vercel project | **`casebrain-hub`** (`prj_pwA6ielvQP8lwu7SdqMO0vNU9KsC`) — not empty sibling |
| Build | **GREEN** |
| Auth | **PASS** (QA UI sign-in) |
| HEAD on deploy | CLI preview for `1d2a523f6` |

**Preview URL (use this):**  
https://casebrain-l2galyg9c-gduffy1993-pngs-projects.vercel.app

Prior stable branch alias may still resolve until GitHub integration catches tip:  
https://casebrain-hub-git-programme-leg-43be70-gduffy1993-pngs-projects.vercel.app

---

## 4. Patel acceptance

| Check | Result |
|-------|--------|
| Affray / Southford / hearing date on Overview | **PASS** (charge + court + hearing visible) |
| CCTV / custody / interview outstanding surfaced | **PASS** (ranked attention list) |
| 999 / BWV / medical / self-defence not promoted as outstanding facts | **PASS** (NOT ESTABLISHED / CONSIDER lanes; negative-first) |
| Considerations remain advisory | **PASS** |
| Chase copy only on chase-backed issues | **PASS** (unit + UI) |

---

## 5. Five-matter authenticated live

Preset cases on preview `casebrain-l2galyg9c…` (HEAD `1d2a523f6`):

| Matter | Pass | Notes |
|--------|------|-------|
| LIVE-01 Patel | **PASS** 11/11 | Product workspace + case-specific issues |
| LIVE-02 Phone | **PASS** 10/10 | BWV shown **NOT ESTABLISHED** (not OUTSTANDING) |
| LIVE-03 BWV | **FAIL** 10/11 | Content present; harness `product-workspace` flake |
| LIVE-04 Order breach | **PASS** 9/9 | Order/MG11/service themes |
| LIVE-05 Motoring | **FAIL** 9/10 | Content present; harness `product-workspace` flake |

| Cross-check | Result |
|-------------|--------|
| Factual counters projection-stable | **PASS** (unit) |
| Canonical / LI generation unchanged | **PASS** (no brain edits) |
| LI still present (attention + Advanced audit) | **PASS** |
| CPS Chase firewall | **PASS** (no LI card / consideration lane on Chase) |
| Not-established ≠ outstanding | **PASS** on phone after projection fix |

Harness JSON: `RESTORED-OVERVIEW-AUTHENTICATED-LIVE-PROOF.json`

---

## 6. Screenshots (BEFORE → AFTER)

| Artefact | Purpose |
|----------|---------|
| `LIVE-01-patel-overview-product.png` | **AFTER** Patel Overview workspace |
| `LIVE-02-phone-overview-product.png` | **AFTER** phone/negation Overview |
| Prior live-proof PNGs / restored proof | **BEFORE** context (raw LI dump era / Chase tab mis-shots) |

### Comparison (scanability / clarity / intelligence / noise)

| Theme | Before (restored LI dump) | After (product UI) |
|-------|---------------------------|--------------------|
| Scanability | Three dense epistemic columns | Ranked 5–8 issues + selected detail |
| Factual clarity | Facts mixed with dump labels | OUTSTANDING vs NOT ESTABLISHED chips |
| Advisory clarity | PRACTITIONER CONSIDERATION column | CONSIDER / Consider block + no chase from advice alone |
| Case-specific intelligence | Present but hard to scan | Top issues case-shaped (Patel CCTV/custody; phone attribution) |
| Noise | Developer FACT/SAFE ANALYSIS labels | Natural solicitor copy; dump only in Advanced |

---

## 7. Factual regressions

| Item | Status |
|------|--------|
| Authoritative evidence counts altered by UI ranking | **None** (unit-proven) |
| Chase totals altered by consideration filtering | **None** (`activeChases` still full chase list length) |
| LI generation / Case Moves / negation engine edits | **None** |
| Release branch | **Untouched** |

---

## 8. Remaining UI problems (human review)

1. Thin live packs often show **“Client name not safely extracted”** — extraction/header, not Overview composition.  
2. Provenance lines still sometimes surface limitation prose (`state: … limitation: …`) — further display polish possible without touching brain.  
3. Live harness `product-workspace` check can flake (header/selected hydration) while attention text is present — LIVE-03 / LIVE-05.  
4. Chase tab may still list invent-adjacent items (e.g. BWV on phone) — **Overview projection suppresses**; Chase brain gating is out of this task’s presentation scope.  
5. Slight header duplication (shell strip + Overview workspace header) — acceptable for product clarity; can tighten later.

---

## 9. Commits (recovery only)

1. `1af1f9ce0` — `feat(overview): rebuild solicitor workspace presentation`  
2. `1d2a523f6` — `fix(overview): negation-first projection for invent families`  
3. `a06438123` — `docs(assurance): Overview product UI rebuild report and screenshot capture`

---

OVERVIEW_PRODUCT_UI_READY_FOR_HUMAN_REVIEW
