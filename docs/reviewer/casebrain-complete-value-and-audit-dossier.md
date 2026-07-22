# Casebrain Hub — Complete Value and Audit Dossier

**Audience:** Intelligent non-technical independent reviewer  
**Purpose:** Evidence-backed explanation of what Casebrain Hub is, what works, what has been proven, and what remains unfinished  
**Generated:** 2026-07-21 (British Summer Time)  
**Repository state:** branch `programme/criminal-defence-integrity-corpus` · commit `f0428b34ff69c223994c7b2a5b56bfdd4aacedbe` · open PR [#65](https://github.com/gduffy1993-png/casebrain-hub/pull/65) (preview — do not merge / do not deploy)  
**Companion index:** `docs/reviewer/casebrain-evidence-index.json`  
**Method:** Read-only inspection of repository evidence plus safe verification commands. **No application behaviour was changed. No defects were fixed. Phase 7 was not begun or extended in this task.**

### Evidence labels used throughout

| Label | Meaning |
|-------|---------|
| **PROVEN** | Directly supported by reproducible repository evidence (and, where stated, re-run in this review) |
| **PARTIALLY_PROVEN** | Some evidence exists; an important gap remains |
| **CLAIMED** | Documented in the repo but not independently reproduced in this review |
| **UNRESOLVED** | Known work remains |
| **NOT_ASSESSED** | Insufficient evidence in this review |

---

## 1. Executive explanation

### What is Casebrain Hub?

Casebrain Hub is a web application for law firms. In plain terms: a solicitor (or caseworker) uploads case papers (often PDFs), the system extracts information, and it presents a structured view of the matter—what evidence appears served, referred, missing, or unsafe to treat as settled—plus draft wording for court prep, client updates, and chasing disclosure.

The **current product focus** (pilot mode) is **criminal defence**, not a finished “everything for every practice area” platform. Older marketing and README text sometimes call the product “production-ready”; that claim is **not** supported by the integrity programme, build/test results in this review, or the pilot trust pack’s own claim discipline. **[PARTIALLY_PROVEN]** for criminal pilot surfaces; **[CLAIMED]** and contradicted for blanket production-readiness.

### Who is it intended to help?

- Criminal defence solicitors preparing for hearings and disclosure chase  
- Supervisors reviewing matters that need oversight  
- Caseworkers assembling packs and chasing papers  
- (Secondary / incomplete) housing and personal-injury practice workflows in the same codebase  

### What serious problem does it solve?

Criminal papers are long, inconsistent, and easy to misread under time pressure. Without a system like this, a solicitor typically:

1. Opens a large PDF bundle  
2. Skims for charges, dates, evidence lists, and gaps  
3. Manually drafts chase emails, court notes, and client summaries  
4. Relies on memory and haste to avoid saying something the papers do not support  

The serious risk is **silent error**: wording that looks polished but truncates, invents, or mixes the wrong type of offence; or a dashboard that shows different numbers from the copy you paste into an email. Casebrain’s integrity work is specifically about detecting and blocking those failures rather than hiding them. **[PROVEN]** as an engineering goal with extensive controlled tests; **[NOT_ASSESSED]** as real-world solicitor outcome improvement (no signed live-matter study in repo).

### Main user journey (criminal pilot)

1. Sign in → Court Today (day list)  
2. Upload papers / open a matter  
3. Work the five-tab desk: **Overview · Court · Papers · Client Summary · CPS Chase** (+ File)  
4. Copy or export only when integrity gates allow; otherwise see “review required” / blocked copy  
5. Supervisor queue for matters needing sign-off  

Runtime smoke evidence exists for this path on demo/production-like accounts (screenshots + reports under `artifacts/casebrain-qa/`). **[PARTIALLY_PROVEN]**

### Why it matters / what happens without it

| Without Casebrain | With Casebrain (as designed) |
|-------------------|------------------------------|
| Manual skim of PDFs | Structured evidence states with source-linked “proof receipts” |
| Ad-hoc chase wording | Draft chase / court / client packs |
| Easy to overstate what papers show | Fail-closed copy when confidence / offence family / sentence integrity fails |
| Different people recount the file differently | Canonical matter fingerprint so tabs should agree |

Time-saving and mistake-reduction are **plausible** from the design and demos, but **no measured hours saved or error-rate study** was found. Do not invent commercial figures. **[CLAIMED]** in older sales docs; **[NOT_ASSESSED]** empirically.

---

## 2. Complete feature inventory

Status key: **complete** · **partial** · **experimental** · **deprecated / unused** · **UI-hidden** (code exists, not shown in shipping case UI).

Verification rule used here: a route name, mock, or plan is **not** counted as a working feature unless implementation and (where possible) tests or QA artifacts support it.

### A. Platform, auth, billing, desktop

| Feature | What it does | Who benefits | Practical benefit | Status | Where | Tests / demo |
|---------|--------------|--------------|-------------------|--------|-------|--------------|
| Multi-tenant workspace | Isolates firm data by organisation | Firms | Separate caseloads | **complete** (core pattern) | `lib/auth-supabase.ts`, `middleware.ts`, Supabase | Used app-wide; RLS review doc |
| Clerk + Supabase auth | Login + org resolution | All users | Access control | **partial** (dual stack) | `middleware.ts`, `lib/auth.ts` → `auth-supabase.ts` | Smoke sign-in in QA |
| Paywall / trial limits | Caps trial usage | Ops / trials | Abuse control | **partial** | `lib/paywall/*`, upload notices | Config-dependent |
| Stripe checkout | Paid plans | Paying firms | Billing | **partial** (`/api/upgrade/placeholder` returns 501) | `app/api/stripe/*` | Config-dependent |
| Electron desktop shell | Opens web app in desktop window | Desktop users | Native window only | **complete** as thin wrapper | `electron/main.js` | No separate product QA |

### B. Criminal solicitor pilot (primary product)

| Feature | What it does | Who benefits | Practical benefit | Status | Where | Runtime demonstrated? |
|---------|--------------|--------------|-------------------|--------|-------|----------------------|
| Criminal pilot mode | Narrows nav; home = Court Today | Criminal solicitors | Less clutter | **complete** | `lib/pilot-mode.ts`, sidebar | Yes — five-tab smokes |
| Court Today | Hearing day list / readiness | Advocates | “What am I doing today?” | **complete** (pilot) | `app/(protected)/court-today` | Yes — screenshots |
| Five-tab matter desk | Overview / Court / Papers / Summary / Chase | Solicitors | One desk for prep | **complete** (pilot UX) | `CriminalCaseView`, pilot desk components | Yes — warmup / duplicate / H5 / Taylor inspect |
| Overview / Five Answers | Snapshot, truth map, proof receipts, gaps | Solicitors | Source-aware file view | **complete** / integrity-gated | `lib/criminal/five-answers/*` | Yes — H5 30 pass / 0 fail (4 warns) |
| Proof receipts | Rely / check / chase / do-not-use with anchors | Solicitors / supervisors | Audit trail for claims | **complete** (engine + UI) | `lib/criminal/proof-receipt/*` | Yes — controlled 3000 metrics |
| Canonical matter state | One fingerprint for counts across surfaces | Integrity | Tabs should not disagree | **complete** (Phases 3–6) | `lib/criminal/canonical-matter-state/*` | Contract + ledger evidence |
| Solicitor output integrity gate | Blocks unsafe copy / deep drafts | Firms | Fail-closed safety | **complete** (gate); corpus PASS open | `solicitor-output-integrity.ts`, gate modules | Unit scripts PASS (re-run) |
| Confidence / sendability dashboard | Shows how sendable firm copy is | Solicitors | Avoid overconfident letters | **complete** (migrated) | `lib/criminal/confidence-dashboard/*` | H5 + Phase 6 migration |
| CPS / disclosure chase | Chase list + copyable wording | Solicitors / paralegals | Faster chase | **complete** (pilot) | Disclosure chase UI + APIs | Five-tab smokes |
| Client summary | Plain-English client-facing draft | Solicitors / clients | Faster updates | **complete** (gated) | Overview / summary views | Smokes |
| Export pack | Copy / download packs | Solicitors | Copy-ready output | **complete** | `export-pack/*` | Unit + proof metrics |
| Supervisor queue | Matters needing review | Supervisors | Oversight | **partial–complete** | `supervisor-queue` | Unit tests |
| Upload → process | PDF/DOCX → extracted matter | Solicitors | Papers → desk | **complete** (core loop) | upload APIs + criminal process | Taylor / H5 smokes |

### C. Criminal advanced (present; not all pilot-primary)

| Feature | Status | Notes |
|---------|--------|-------|
| Strategy battleboard / fight engines | **partial** | Rich code; pilot de-emphasises legacy tabs |
| Defence plan + chat | **partial–complete** | Real API; evidence joins still gated / not fully structured (**PROVEN** residual) |
| Control Room / Hearing War Room assistants | **partial** | Less covered in five-tab smokes |
| PACE / bail / sentencing / loopholes panels | **partial** | APIs + components |
| Aggressive defence generators | **experimental** | Treat as experimental, not core pilot |
| Criminal audit log UI | **partial** / labs | Labs route |
| Client stress test / explanation | **experimental–partial** | Tests exist |

### D. Shared ingestion / analysis

| Feature | Status | Notes |
|---------|--------|-------|
| Secure upload + storage | **complete** | Supabase storage |
| AI extraction | **complete** as dependency path | OpenAI + parsers |
| Redaction | **partial** | API exists; light QA |
| Timeline / chronology | **partial–complete** | Multiple modules |
| Bundle navigator | **partial** | Some Phase C/D placeholders in code |
| Global search | **partial** | Page exists; in-case search often ship-hidden |

### E. Housing / PI / family / firm ops

| Area | Status | Honest note |
|------|--------|-------------|
| Housing dashboard, intake, Awaab tools | **partial** | Real code; not criminal pilot flagship |
| PI dashboard, intake, valuation, settlement | **partial** / many **UI-hidden** | Older “100% complete” docs overclaim |
| Family aggressive-defence API | **experimental** | |
| Time / email / SMS / e-sign / trust / profitability | **UI-hidden** | Commented “hidden for ship” on case page |
| Evidence tracker / win-stories dashboards | **deprecated / unused UI** | Docs claim pages that are missing or commented out |
| Client portal | **partial** | Token portal exists |
| Knowledge / inbox / risk / briefing / builder | **labs / experimental** | |

### F. Alerts and integrity warnings

| Feature | Status | Evidence |
|---------|--------|----------|
| Integrity banners / copy blocked | **complete** on criminal solicitor path | Gate + UI consumers |
| Review-required on substantive omit | **complete** in programme evidence | 56 substantive omissions, silent loss prevented (**PROVEN** in ledger) |
| Analysis gate banner | **complete** | Component present |
| Risk alerts on case page | Often **UI-hidden** | |

### G. Not features (traps)

- `/api/upgrade/placeholder` → 501 “coming soon”  
- Sidebar `/proof-review` without matching page  
- Docs claiming `/dashboard/supervision` and `/dashboard/win-stories` without those pages  
- Criminal “Safety & procedural” tab “coming soon” copy  

---

## 3. Realistic case walkthroughs

All examples use **fictional** names and facts. No real personal data.

### Journey A — Simple case (illustrative + partially proven)

**User enters:** One short harassment MG / charge sheet PDF for “Alex Reed”.  
**App does:** Creates matter; extracts charge/court cues; Overview shows provisional source-linked positions.  
**Screens:** Upload → Overview → Client Summary.  
**Useful output:** Short client-facing draft + gaps list.  
**Safeguards:** Integrity gate on copy; proof receipts for claims.  
**Proof status:** **PARTIALLY_PROVEN** — upload→overview demonstrated in smokes with demo “Taylor Brookes” harassment matter; this exact name is illustrative only.

### Journey B — Complicated case with substantial evidence (partially proven at scale on fictional packs)

**User enters:** Multi-document bundle (index, MG11s, CCTV schedule, unused material).  
**App does:** Builds evidence truth map; marks served / referred / missing; generates chase items and court note drafts.  
**Screens:** Overview, Papers, CPS Chase, Court, Export pack.  
**Useful output:** Chase list + proof packet + confidence/sendability.  
**Safeguards:** Hard-safety counters on controlled packs; fail-closed family/sentence rules.  
**Proof status:** **PARTIALLY_PROVEN** — controlled **3000** fictional PDF-backed bundles with **0** hard-safety failures (`controlled-3000-proof-metrics.json`). Not solicitor-reviewed real files.

### Journey C — Long / sensitive / easily truncated wording (proven in integrity programme)

**User enters:** Matter whose composed strings include truncated fragments or raw extraction markers.  
**App does:** Structured composer reconstructs or safely omits; shows review-required rather than silent cut text.  
**Screens / systems:** Copy/API surfaces through shared validator.  
**Useful output:** Either reconstructed full wording or explicit omit with solicitor review message.  
**Safeguards:** Occurrence ledger dispositions; substantive omit messaging.  
**Proof status:** **PROVEN** on fixtures — prior 28 trunc occurrences dispositioned; current 55 per-string trunc hits all `safely_omitted` with review wording; diagnostic `len=21;hash=4dc9a04370a2`.

### Journey D — Solicitor reviewing matter status (partially proven)

**User enters:** Opens Court Today and Supervisor Queue for today’s list.  
**App does:** Lists hearings / readiness; queue of matters needing attention.  
**Screens:** `/court-today`, `/supervisor-queue`, matter Overview confidence.  
**Useful output:** Prioritised work list + sendability cues.  
**Safeguards:** Org scoping; pilot filters.  
**Proof status:** **PARTIALLY_PROVEN** — Court Today and Overview smokes; supervisor unit tests; not a full live firm study.

### Journey E — Copying / exporting (partially proven)

**User enters:** Clicks copy on chase / court / client pack sections.  
**App does:** Runs integrity gate; either copies safe text or returns integrity_blocked / disables copy.  
**Screens:** Export pack / Overview copy controls / APIs.  
**Useful output:** Clipboard or JSON download.  
**Safeguards:** Shared gate on 31 central surfaces; fingerprint echo.  
**Proof status:** **PARTIALLY_PROVEN** — contracts + smokes; full N=3000 wording materialisation still incomplete for corpus PASS.

### Journey F — Omission / integrity warning (proven on fixtures)

**User enters:** Attempts to copy a defective truncated evidence string.  
**App does:** Omits substantive item and surfaces review-required message (does not silently drop).  
**Screens:** Copy path consumers.  
**Useful output:** Warning that solicitor must check papers.  
**Safeguards:** `silentLossPrevented: true`; 56 substantive / 0 non-substantive omits.  
**Proof status:** **PROVEN** in Phase 6 ledger artifacts.

---

## 4. Why the integrity programme matters

### Everyday language

Imagine three people summarise the same police file. If one person quietly cuts half a sentence, another invents a charge type from a neighbouring case, and a third pastes a draft that looks fine but was truncated by a bug, the firm can send something dangerous **without noticing**. The integrity programme is the project’s answer to that: treat solicitor-facing wording like evidence that must be traceable, consistent, and fail loudly when unsafe.

### Exact wording

Truncation and “raw extraction markers” are not cosmetic. A half-sentence in a chase email can change meaning. Preserving or **openly refusing** to emit wording is safer than silent shortening. **[PROVEN]** as programme focus via rule clusters `sentence.raw_extraction_marker` and `sentence.truncated_fragment`.

### Why surfaces must agree

Copy, APIs, summaries, dashboards, and solicitor views must not invent different “truths.” Canonical fingerprints are short digital signatures of the matter’s structured counts (evidence, chase, family, etc.). If a surface shows a fingerprint that does not match the canonical one, the validator can block it as inconsistent. **[PROVEN]** for 31 central surfaces in contracts.

### Validators vs “review-required”

- **Validators / gates:** automated checks that block or degrade output.  
- **Review-required:** human must look at the papers before relying on or omitting a point.  

Detecting a problem ≠ resolving the underlying case content. Phase 4 residual uncertain-family cases remain fail-closed without claiming PASS. **[PROVEN]** distinction in Phase 4 checkpoint.

### Detect vs resolve

| Detect | Resolve |
|--------|---------|
| Gate blocks bad copy | Composer reconstructs safe structured wording |
| Ledger lists every historical occurrence | Stock repaired or safely omitted with message |
| Uncertain offence family blocked | Full corpus + human gold review (later phases) |

---

## 5. Full phase-by-phase history (Workstream A integrity programme)

**Programme home:** `docs/integrity-programme/README.md`  
**Branch / PR:** `programme/criminal-defence-integrity-corpus` / **#65** (do not merge / deploy)  
**Corpus PASS:** never claimed for Phases 0–6  

> **Historical note:** Other “Phase 1/2/3…” documents exist elsewhere in the repo (criminal strategy, UI, eval). Those are **different programmes**. This section is the criminal-defence **integrity / corpus** programme.

### Phase 0 — Discovery & baseline

| Field | Content |
|-------|---------|
| Objective | Discover corpus scale and baseline integrity rule hits without mutating fixtures |
| Acceptance (expressed) | Discovery complete; not PASS |
| Initial risks | Unknown defect density; catalog gaps |
| Work completed | Manifest, catalog, coverage gaps, baseline failures/clusters |
| Key counts | N scale3000=**3000**; materialised=**530**; union=**3530**; baseline hits=**2964** / 499 fixtures |
| Files / artefacts | `docs/integrity-programme/phase-0-checkpoint.md`; `artifacts/.../phase-0/*` |
| Script | `npx tsx scripts/integrity-programme/phase0-discover-corpus.ts` |
| Checkpoint | DISCOVERY COMPLETE — not PASS |
| Commit (approx.) | `e43d8c480` |
| Evidence supports completion? | **PROVEN** as discovery checkpoint; not PASS |

### Phase 1 — Surface inventory

| Field | Content |
|-------|---------|
| Objective | Machine-readable inventory of solicitor output pathways |
| Counts | **51** surfaces (view 24 / copy 10 / export 4 / API 14); gate=none 22 |
| Artefact | `artifacts/.../phase-1/surface-inventory.json` |
| Missing | No `PHASE-1-CHECKPOINT.md` under artifacts (docs-only) |
| Commit | `eb6e66731` |
| Status | INVENTORY COMPLETE — not PASS **[PROVEN]** |

### Phase 2 — Fail-closed containment

| Field | Content |
|-------|---------|
| Objective | Gate inventoried wording exits; no silent generic substitution |
| Work | Central `solicitor-output-gate.ts`, `gated-json-response.ts`; 31 central surfaces |
| Tests | Gate/integrity scripts PASS (re-run 2026-07-21) |
| Checkpoint | CONTAINMENT COMPLETE — not corpus PASS |
| Commit | `1d62f8bb7` |
| Status | **PROVEN** containment engineering; corpus PASS **UNRESOLVED** |

### Phase 3 — Canonical model + dual-lane

| Field | Content |
|-------|---------|
| Objective | CanonicalMatterStateV1 + dual-lane reporting |
| Schema | v1.0.0; rebuild equality PASS on 530 fixtures; 0 compat failures |
| Stock origin | copyable/exportable raw marker occurrences **72**; trunc **28** |
| Still independent then | confidence_dashboard, overview-presentation, solicitor-matter-state |
| Commit | `8fe5a69a2` |
| Status | COMPLETE — not corpus PASS **[PROVEN]** |

### Phase 4 — Offence-family registry + disposition

| Field | Content |
|-------|---------|
| Objective | Family concept registry; dispose blockers without fake PASS |
| Initial | Independent calculators; composer stock pending; residual uncertain families |
| Later disposition (2026-07-21) | Calculators RESOLVED; composer stock RESOLVED; scale probes RESOLVED_AS_CONTAINMENT_PROOF; residual uncertain FAIL_CLOSED_WITH_RESIDUAL_RISK; human FP/FN DEFERRED_TO_PHASE_9_11 |
| Residual | mixed=281, uncertain=400, overlap=196 |
| Adversarial matrix | allPass=true (9 checks) |
| Checkpoint wording conflict | Phase 6 blob still says “safe-but-unresolved”; Phase 4 docs say **UNRESOLVED ITEMS DISPOSITIONED** — both agree **not PASS** |
| Commits | `ed2c3281a`, disposition `3a7a21994` |
| Status | **PARTIALLY_PROVEN** / **UNRESOLVED** residual risk |

### Phase 5 — Structured composer

| Field | Content |
|-------|---------|
| Objective | Structured solicitor output composer; stock repair |
| Module | `lib/criminal/structured-solicitor-output/` v1.0.0 |
| Per-string stock | raw 42 (recon 41 / omit 1); trunc 55 (omit 55) — **different unit** from 72/28 |
| Commit | `c023b0ceb` |
| Status | COMPLETE as migration step — not corpus PASS **[PROVEN]** as checkpoint; units must not be mixed |

### Phase 6 — Validator + canonical migration + ledger

| Field | Content |
|-------|---------|
| Objective | Shared validator, finish calculator migration, balance occurrence ledger |
| Status | CLOSED — LEDGER_BALANCED (ack 2026-07-21) — not corpus PASS |
| Commits | `7a298d8d7`, `a3172e220`, `7e5ba6d6f` |
| Holds | No merge / deploy / Phase 7 (programme rule at close) |
| Evidence supports close? | **PROVEN** ledger balance + migrations in artifacts; corpus PASS still false |

### Phase 7 — Extraction / provenance boundary (on branch; not extended here)

| Field | Content |
|-------|---------|
| Repo state | Commit `f0428b34f` + `artifacts/.../phase-7/PHASE-7-CHECKPOINT.md` exist |
| Programme README | Still lists Phases 7–11 as **PENDING** |
| This review | **Did not begin or extend Phase 7.** Treat as **CLAIMED / PARTIALLY_PROVEN** boundary work pending separate review; not a corpus PASS |

### Phases 8–11 / Workstream B

**PENDING / BLOCKED** until Workstream A gates pass (`docs/integrity-programme/README.md`). **[UNRESOLVED]**

---

## 6. Phase 6 and occurrence-ledger evidence

### 6.1 Phase 6 claim verification

| Claim | Verdict | Evidence |
|-------|---------|----------|
| confidence_dashboard migrated with fingerprint exposed | **PROVEN** | Ledger `completionSummary` + dashboard module; fingerprint match |
| overview-presentation migrated to adapter | **PROVEN** | `migrated_adapter_deprecated_independent`; counts match |
| Independent algorithm deprecated | **PROVEN** | Deprecated independent path; delegates to canonical |
| solicitor-matter-state → canonical fingerprint | **PROVEN** | Migrated; fingerprint match |
| No independent calculators remain | **PROVEN** (nuance) | No independent *algorithms*; deprecated adapter entry points may remain for call-site compat |
| All 31 central surfaces contract-checked | **PROVEN** | `surface-contracts.json`; re-run `phase6-validator-contracts.test.ts` / surface contract via `tsx` PASS |
| 56 substantive omissions review-required | **PROVEN** | `substantiveWithReviewRequired: 56` |
| Zero non-substantive omissions | **PROVEN** | `nonSubstantiveSilentOk: 0` |
| Silent substantive loss prevented | **PROVEN** | `silentLossPrevented: true` |
| Validator coverage 31 of 51; 20 excluded | **PROVEN** | Inventoried 51; central 31; excluded list length 20 (parent shells / gate=none / parent-covered) |
| Defence-plan-chat joins gated but not fully structured | **PROVEN** | `remainingLegacyComposers` |
| Phase 4 safe but unresolved | **PARTIALLY_PROVEN / stale label** | Prefer: dispositioned blockers; residual risk; **not PASS** |

Authoritative files:  
`docs/integrity-programme/phase-6-occurrence-ledger-balance.md`  
`artifacts/casebrain-qa/integrity-programme/phase-6/occurrence-ledger-balanced.json` (generated 2026-07-21T03:00:43.932Z)

### 6.2 Historical 72 — unit `copyable_exportable_rule_firing_occurrence`

Definition: fixture × mode {copy, api} when a batch of ≤16 strings fires the rule.

| Disposition | Count | Verified |
|-------------|------:|----------|
| Reconstructed | 35 | Yes — JSON + 72 TSV rows |
| Safely omitted | 1 | Yes |
| Proven API duplicates | 36 | Yes |
| Still blocked | 0 | Yes (absent) |
| Retired route | 0 | Yes |
| No longer reproducible | 0 | Yes |
| **Total** | **72** | `balanced: true`; every ID has disposition |

Sources: `prior-72-raw-occurrence-index.tsv` (72 data rows); `prior72RawMarkerMap.occurrences` in balanced JSON.

### 6.3 Historical 28 and current 55 — do not mix units

| Figure | Unit | Meaning |
|-------|------|---------|
| Historical 72 / 28 | `copyable_exportable_rule_firing_occurrence` | Dual-mode batch firings |
| Current 42 / 55 | `per_string_copyable_hit` | Each defective string in deeper walk |

**Historical 28 verification [PROVEN]:**

- 14 safely omitted (copy)  
- 14 proven-duplicate (api)  
- 14 unique fixtures (= 28 ÷ 2)  
- Shared diagnostic on trunc stock: **`len=21;hash=4dc9a04370a2`**

**Current 55 verification [PROVEN]:**

- 14 baseline-correspondent per-string hits  
- 41 newly discovered deeper-walk hits  
- 0 differently counted hits in same window  
- Same diagnostic on all 55 TSV rows  
- All dispositioned `safely_omitted`

**Why 55 − 28 = 27 is invalid:** it subtracts dual-mode **batch firings** from **per-string** hits.  

**Valid same-unit arithmetic:** 14 baseline + 0 extra-on-baseline + 41 newly discovered = **55**.

---

## 7. Complete evidence inventory

| Category | Paths (representative) | Proves | Does not prove |
|----------|------------------------|--------|----------------|
| Programme plans / README | `docs/integrity-programme/README.md` | Scope, phase table, holds | Live production readiness |
| Phase checkpoints | `docs/integrity-programme/phase-*-checkpoint.md` | Phase status & counts | Corpus PASS |
| Occurrence ledgers | `occurrence-ledger*.json`, `OCCURRENCE-LEDGER-BALANCE.md` | 72/28/55 dispositions | Real-matter accuracy |
| Raw indexes | `prior-72-*.tsv`, `prior-28-*.tsv`, `current-55-*.tsv` | ID-level disposition | UX usability |
| Surface inventory | `phase-1/surface-inventory.json` | 51 surfaces | That all are safe |
| Exclusion / contracts | `surface-contracts.json`, validator coverage in ledger | 31/20 split | Runtime on every firm |
| Fixtures / corpora | ESA / messy-pdf / gold / h4 packs under `artifacts/` & `docs/` | Controlled behaviour | Live solicitor validation |
| Unit / contract tests | `scripts/*.test.ts`, `lib/**/__tests__` | Local assertions | Full app journeys |
| Smoke / screenshots | `artifacts/casebrain-qa/*smoke*`, `*five-tab*`, `taylor-*` | Demo/prod-like UI paths | Accessibility / perf |
| Controlled 3000 | `artifacts/casebrain-proof/controlled-3000-proof-metrics.json` | Hard-safety clean on fictional 3000 | Real-world audit |
| Pilot trust pack | `docs/pilot-trust-pack/*` | Claim discipline + ops intent | Certifications |
| Security RLS review | `docs/security/SECURITY_RLS_REVIEW_CURRENT.md` | Code-review findings 2026-06-09 | Live policy audit / pen-test |
| Build/type/lint/test logs (this review) | `artifacts/casebrain-qa/reviewer-dossier-*.txt` / `.json` | Current verification snapshot | Historical CI green forever |
| PRs / commits | PR #65; commits listed in §5 | Engineering history | Merge approval |

---

## 8. Test and engineering evidence (this review)

**Environment (2026-07-21):** Windows 10 · Node `v20.19.4` · npm `10.8.2` · branch `programme/criminal-defence-integrity-corpus` · HEAD `f0428b34f…`

| Command | Result | Summary |
|---------|--------|---------|
| `npm run lint` | **PASS** (exit 0) | ESLint completed |
| `npm run typecheck` | **FAIL** (exit 2) | Many TS errors across `lib/eval/*`, integrity scripts, adapters (`EvidenceReliability`), etc. |
| `npm run build` | **FAIL** (exit 1) | Webpack `UnhandledSchemeError: node:crypto` via `solicitor-output-gate.ts` → ClientExplanationPanel → CriminalCaseView |
| `npx vitest run` | **FAIL** (exit 1) | **114** assertions passed, **15** failed, **0** skipped across **112** files (Vitest JSON). Failures include date-sensitive limitation/Awaab tests, missing `validateCourtName`, criminal-purity copy, housing supervision disclaimer text |
| Integrity scripts via `npx tsx` | **PASS** | gate, integrity, surface-contract, phase6-validator-contracts all PASS |
| Same `*.test.ts` under Vitest | **FAIL as suites** | Scripts are standalone (print PASS) but Vitest reports “No test suite found” |
| `npm run test:e2e` | **NOT RUN** | Requires Playwright auth setup + running server; not executed in this review |
| Full Phase 0–6 corpus re-generation | **NOT RUN** | Long / heavy; existing artifacts cited instead |

**Interpretation:** Passing integrity **scripts** prove gate/contract behaviour for those harnesses. They do **not** prove untested live UI paths. Failing typecheck/build are material engineering quality findings for production readiness. **[PROVEN]** as of this run.

---

## 9. Engineering quality

### Architecture (plain English)

Next.js App Router front end + API routes; Supabase for data/storage; Clerk middleware for sessions; OpenAI for extraction/chat; criminal domain logic concentrated under `lib/criminal/` with UI under `components/criminal/`.

### Data path

Upload → storage → extraction → structured matter views → optional copy/export through **shared integrity gate** and **canonical fingerprint** checks.

### Centralisation strengths

- Shared solicitor output gate and validator  
- CanonicalMatterStateV1 as single count/fingerprint source after Phase 6  
- Structured composer for stock repair  

### Weaknesses / debt

- Large surface area (~250 API routes); many secondary practice modules  
- Dual auth (Clerk + Supabase) complexity  
- Legacy composers remain (defence-plan-chat joins)  
- Deprecated adapters still reachable for compatibility  
- Typecheck/build currently failing on this branch  
- Older docs overstate completeness  
- Vitest vs standalone script testing inconsistency  

**Maintainability:** Strong documentation discipline in the integrity programme; uneven elsewhere. **[PARTIALLY_PROVEN]**

---

## 10. Security and privacy

| Topic | Evidence | Label |
|-------|----------|-------|
| Authentication | Clerk middleware + Supabase auth context | **PARTIALLY_PROVEN** |
| Authorisation / org isolation | `requireAuthContext`, `verifyCaseInOrg`, RLS on persistence tables | **PARTIALLY_PROVEN** (code review 2026-06-09) |
| Matter-level access | Case-in-org checks on APIs | **PARTIALLY_PROVEN** |
| Sensitive legal data | Pilot isolation described; raw text server-side | **CLAIMED** ops docs |
| Logs / analytics | Inventory incomplete; confirm at kick-off | **NOT_ASSESSED** |
| Exports / downloads | Integrity-gated criminal packs; broader export surface large | **PARTIALLY_PROVEN** |
| API exposure | Many routes; service-role bypasses RLS with manual checks | **PARTIALLY_PROVEN** with residual risk |
| Uploads | Supabase storage; paywall/trial limits | **PARTIALLY_PROVEN** |
| Injection / secrets | Standard Next/Supabase patterns; `.env` present locally — not audited here | **NOT_ASSESSED** |
| Encryption | TLS + host at-rest (trust pack) | **CLAIMED** |
| Audit logs | Criminal audit events tables + UI (labs) | **PARTIALLY_PROVEN** |
| Retention / deletion | Pilot+14d described; contacts blank until kick-off | **CLAIMED** |
| Backup / recovery | Not evidenced | **NOT_ASSESSED** |
| Certifications (SOC2/ISO/pen-test/SRA) | Explicitly **not** claimed | **PROVEN** absence of claim |

**Do not treat integrity strength as production security certification.**

---

## 11. Usability and accessibility

### Screens (pilot-primary)

Court Today; Cases list; Matter five tabs; Upload; Supervisor queue; Search; Settings; plus many secondary/labs routes.

### Assessment

| Aspect | Code-level | Behaviour tested |
|--------|------------|------------------|
| Navigation (pilot) | Focused nav filter | Smoke screenshots show five tabs |
| Clarity / legal terminology | Source-linked / provisional labels | H5/warmup smokes |
| Error / integrity messages | Review-required copy in ledger | Fixture-proven; limited live UX study |
| Empty / loading | Present in UI code | Partial smoke coverage |
| Mobile | Some mobile screenshots in QA | **PARTIALLY_PROVEN** |
| Keyboard / focus / screen reader / contrast | Scattered `aria-*`; eslint jsx-a11y transitive | **NOT_ASSESSED** — no axe/WCAG pack |

---

## 12. Performance and reliability

| Topic | Evidence | Label |
|-------|----------|-------|
| Page speed / Web Vitals / Lighthouse | None found as artefacts | **NOT_ASSESSED** |
| Large matters / 3000-pack harness | Controlled proof scaled to 3000 fictional bundles | **PARTIALLY_PROVEN** (harness, not UX latency) |
| Deep nesting / repeated calc | Canonical fingerprint intended to reduce divergence | **CLAIMED** design benefit |
| Concurrent edits / recovery | Not evidenced | **NOT_ASSESSED** |
| Service failure behaviour | Not systematically evidenced | **NOT_ASSESSED** |
| Build reliability on this branch | Build failed (`node:crypto`) | **PROVEN** failure |

---

## 13. Commercial and practical value

**Based only on demonstrated features:**

- Could reduce time spent skimming PDFs into a first structured view (**plausible**; unmeasured).  
- Could reduce silent overstatement via fail-closed copy (**supported by controlled tests**).  
- Could improve consistency of chase / court / client drafts (**supported by design + smokes**).  
- Differentiator: integrity programme + proof receipts + controlled scale hard-safety — unusual seriousness for a young legal AI product.  

**Still needs real-user validation:** hours saved, willingness to pay, error reduction on live files, supervisor workflow fit.

**Do not invent:** revenue, customers, market size, or time-saving percentages. None found as measured evidence.

---

## 14. Honest limitations (prominent)

1. **Unfinished phases:** 8–11 and Workstream B pending; Phase 7 present on branch but not corpus-closed / not extended here.  
2. **Phase 4 residual:** uncertain/mixed family correctness fail-closed ≠ PASS; human FP/FN deferred.  
3. **Legacy composer:** defence-plan-chat evidence joins gated but not fully structured.  
4. **Untested / lightly tested workflows:** many housing/PI/firm-ops panels; Playwright suite essentially one smoke.  
5. **Missing security evidence:** no pen-test, SOC2, ISO, named live subprocessors schedule.  
6. **Missing accessibility evidence:** no WCAG/axe pack.  
7. **Missing performance evidence:** no Lighthouse/CWV baseline.  
8. **Missing production evidence:** programme explicitly do-not-deploy; controlled fictional proof ≠ live firms.  
9. **Known verification failures this review:** typecheck fail; build fail; 15 Vitest failures.  
10. **Assumptions:** demo accounts and fictional packs behave like production under pilot constraints.  
11. **UI-only / hidden / missing:** ship-hidden ops panels; orphan nav; overclaiming older feature lists.  
12. **Corpus PASS:** not achieved.  
13. **README “production-ready”:** not supported by this evidence set.

---

## 15. Evidence labels — material conclusions

| Conclusion | Label |
|------------|-------|
| Criminal pilot five-tab desk exists and has been smoked | **PARTIALLY_PROVEN** |
| Integrity gate blocks unsafe copy on central surfaces | **PROVEN** (scripts + contracts) |
| Phase 6 ledger 72/28/55 arithmetic and dispositions | **PROVEN** |
| Silent substantive loss prevented in stock omit path | **PROVEN** |
| Controlled 3000 hard-safety clean (fictional) | **PROVEN** (artifact) |
| Real solicitor-validated live accuracy | **NOT_ASSESSED** / explicitly unfinished |
| Entire app production-ready today | **UNRESOLVED** / contradicted by holds + build fail |
| Accessibility / performance production bar | **NOT_ASSESSED** |
| Phase 4 corpus PASS | **UNRESOLVED** (dispositioned ≠ PASS) |

---

## 16. Scorecard (0–10)

Scores reflect **demonstrated** quality, not documentation volume.

| Area | Score | Evidence & deductions |
|------|------:|------------------------|
| Functional completeness | **5** | Strong criminal pilot core; large secondary/hidden surface incomplete |
| Practical usefulness | **6** | Clear solicitor desk value; unmeasured time savings; demo-proven |
| Data integrity | **8** | Outstanding programme discipline Phases 0–6; residual Phase 4 risk; not corpus PASS (−2) |
| Test quality | **5** | Deep integrity harnesses; Vitest failures; scripts not Vitest-native; thin Playwright |
| Code quality | **4** | Typecheck/build failing on branch; dual auth; legacy paths (−) |
| Security and privacy | **4** | Thoughtful pilot docs + RLS review; no certs/pen-test; residual RLS notes |
| User experience | **6** | Pilot nav focused; smoke evidence; some H5 warns (missing panels) |
| Accessibility | **2** | Almost no dedicated evidence |
| Performance | **2** | Scale harness ≠ UX metrics; no CWV pack |
| Reliability | **4** | Build broken here; hard-safety strong on fictional packs |
| Maintainability | **6** | Excellent integrity docs; sprawling modules + debt |
| Production readiness | **2** | Explicit do-not-deploy; build fail; corpus PASS open; real-world unproven |

---

## 17. Two separate verdicts

### A. Quality and value of the engineering completed so far

**Strong, unusually serious engineering for a legal AI workspace—especially the integrity programme, canonical matter state, controlled fictional proof at 3000, and fail-closed solicitor copy discipline.** The work shows careful counting, refusal to fake “PASS,” and substantial implementation behind the criminal pilot desk. This is high-value completed engineering, not vapourware.

### B. Readiness of the entire application for real-world production use today

**Not ready for unsupervised production use of real legal cases.** PR #65 and programme docs forbid merge/deploy; corpus PASS is open; typecheck and production build fail on the reviewed revision; accessibility/performance/security certification evidence is thin or absent; real solicitor-signed validation is still the stated next gate. Treat as a **supervised pilot candidate on controlled/redacted terms**, not a production release.

---

## 18. What I would tell the developer’s partner

Casebrain Hub is a real application aimed at helping criminal defence solicitors turn messy papers into a structured matter desk—Overview, Court, Papers, Client Summary, and CPS Chase—with draft wording that tries hard **not** to invent or silently cut important text.

What is impressive is the **integrity work**: the team built automated gates, a single “fingerprint” of matter state so screens should agree, and large controlled tests (including about **3,000** fictional PDF bundles with **zero** hard “safety” failures in that harness). They also kept careful ledgers so old defect counts were not quietly rewritten. That kind of honesty is rare and valuable.

What is unfinished is equally important. The full “corpus PASS” is not done. Some offence-family cases are blocked rather than proven correct. Chat wording paths still have legacy pieces. The wider app (housing, PI, billing panels, etc.) is uneven. On the copy of the code reviewed for this dossier, the production **build and typecheck failed**, and there is no solid accessibility or performance audit pack. The project itself says **do not merge or deploy** this programme branch yet.

**Maturity label:** **strong functional prototype / early supervised beta** for the criminal pilot desk—not a release candidate for unsupervised production, and not production-ready for real legal cases without further gates.

**Before safely handling real legal cases at scale, at minimum:** fix build/type health; finish remaining integrity phases and human gold review; run a supervised redacted/live pilot with signed solicitor checks; complete named subprocessor and security kick-off; add accessibility and operational monitoring evidence; and only then reconsider deploy under explicit firm controls.

---

## Appendix A — Verification commands run (this review)

```text
npm run lint
npm run typecheck
npm run build
npx vitest run --reporter=json --outputFile=artifacts/casebrain-qa/reviewer-dossier-vitest.json
npx tsx scripts/solicitor-output-gate.test.ts
npx tsx scripts/solicitor-output-integrity.test.ts
npx tsx scripts/solicitor-surface-contract.test.ts
npx tsx scripts/phase6-validator-contracts.test.ts
```

## Appendix B — Claims that could not be substantiated or were contradicted

| Claim / impression | Finding |
|--------------------|---------|
| README “production-ready” | Contradicted by programme holds, build/typecheck fail, trust-pack claim discipline |
| Older “all critical features 100% complete” lists | Contradicted by UI-hidden panels and missing pages |
| Phase 4 “safe-but-unresolved” as sole status | Stale vs later “UNRESOLVED ITEMS DISPOSITIONED”; neither is corpus PASS |
| 55−28=27 “new truncations” | Invalid mixed-unit arithmetic |
| Vitest automatically runs integrity scripts as suites | Scripts PASS under `tsx` but fail as Vitest suites |
| Full app E2E green | Playwright not run; suite is minimal |
| Accessibility / performance production fitness | No evidence pack |
| Phase 7 programme complete | Artifacts exist; README still PENDING; not assessed as PASS here |

---

*End of dossier. Companion machine-readable index: `docs/reviewer/casebrain-evidence-index.json`.*
