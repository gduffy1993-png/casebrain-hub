# Criminal pilot — master plan (merged)

**Status:** Layers 1–3 shipped. **Modules 1–7 LIVE** on prod. **2,200 factory PASS**. **H1 + H2 done.** **H3 Trust layer in progress.** **No design-partner trial yet.**

**Decision (Ged):** Finish proof → trust → real-world → workstation → then firm. Do not rewrite Brain 1. Frozen cores unless dangerous and no other route.

**Cursor / Codex split:** Cursor builds, commits, deploys, gates, prod smoke. Codex specs, Layer 7 reads, red-team manifests, export matrices — parallel, no same-file Brain edits.

**Plan lock:** No further expansion unless a real solicitor exposes a new requirement.

**Snapshot:** `docs/CURRENT_STATUS.md` (updated each milestone)

## Principle

**Same information, simpler shell.** Extraction, chase briefs, control room reasoning, and factory rules are not modified by layout work.

**Three parallel tracks (don’t block module ship on polish or offence depth):**

| Track | Goal | When |
|-------|------|------|
| **A — Module stack** | Modules 1–7 + 2,200 eval | **Done** — maintain on ship |
| **B — Offence depth** | Family → offence-specific packs where pilots need them | After Module 7, driven by real uploads |
| **C — Commercial** | 3–5 firms, structured QA, UX hardening | Overlap once Module 5+6 in prod |

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

## Layer 4 — Pilot hardening (parallel, not blocking modules)

| Item | Status | Notes |
|------|--------|-------|
| Browser cold-start on S1 upload | ✅ | `scripts/.tmp-cold-start-gauntlet.ts` — report `artifacts/casebrain-qa/cold-start/` |
| CB-FRESH-001/002 adversarial bundles | ✅ | Taylor/Jordan — Codex Layer 7 PASS WITH MINOR WARNINGS post-P2 |
| No tracker/demo leakage QA | ✅ | Cold-start clean; CB-FRESH prod audit clean |
| Paywall/trial clarity | ✅ | Pilot banner + upload trial limits notice |
| Real redacted matters (consent) | Later | After synthetic pilot stable |
| Prod smoke probes | ✅ | Paige + Neil via Supabase pipeline scripts |

### UX & reliability polish (ruthless but scoped)

Ship modules first; polish in passes:

| Area | Must-have before firms | Nice-to-have |
|------|------------------------|--------------|
| Loading / empty / error states | ✅ | — |
| Court Today + case shell hierarchy | ✅ | Mobile pass |
| Bundle parse fallback + MG6/snippet assembly | ✅ | Worker-thread PDF parse |
| Forbidden-claim / provisional language | ✅ | Extra sanitisation rules |
| Kill switches per module | ✅ Done | — |

## Layer 5 — Intelligence superpower stack (additive, eval-gated)

**Principle:** Core brains stay frozen. Each module ships alone → Tier A/B corpus gate → freeze → next module. One final 2,200-case eval proves the full stack. Kill switches per module allow rollback without revert.

### Frozen core (never retrained for packaging)

| Brain | Role |
|-------|------|
| **Upload / extract** | PDF → structured bundle text, MG5/MG6, metadata |
| **Battleboard** | Offence routing, primary route, collapse risks, evidence anchors |
| **Disclosure Chase** | REQ items, chase wording, why-it-matters |
| **Hearing War Room (Today)** | Court-day position, say-this, do-not-overstate, ask court to record |
| **Factory eval (CB-TB 1–2200)** | Non-regression gate — must stay 0 fail |

### Matter Brief (Summary tab) — assembly only

Six sections assembled from existing brains + contradiction layer (no new reasoning in the assembler):

1. Provisional case theory  
2. Risks (prosecution + defence)  
3. Defence opportunities  
4. Disclosure chase  
5. PTPH / case management note  
6. Client-safe explanation  

### Contradiction & reasoning modules (build order)

| # | Module | Detects |
|---|--------|---------|
| 1 | **Bundle contradictions** | **FROZEN v1** — location, first contact, loss figure, CCTV window |
| 2 | **Sequence engine** | **LIVE v1** — initiation vs retreat; charge-window vs single-incident timeline |
| 3 | **Scope contradictions** | **LIVE v1** — charge period vs evidence window, “multiple” vs “one”, count scope |
| 4 | **Strength contradictions** | **LIVE v1** — serious harm alleged vs minor injury; force/weapon vs limited CCTV |
| 5 | **Multi-incident reasoning** | **LIVE v1** — multiple charge dates vs single-episode MG5; multiple complainants vs single served narrative |
| 6 | **Cross-evidence triangulation** | **LIVE v1** — MG11 vs CCTV; CAD/999 vs scene; BWV vs complainant account |
| 7 | **Client-safe explanation engine** | **LIVE v1** — plain-English Section 6 from contradiction stack |

Each module: `extract-*` → enrich War Room → `buildMatterBrief` routes lines to Theory / Risks / Opportunities. Env kill switch per module.

**Kill switches (prod):**

| Env var | Module |
|---------|--------|
| `NEXT_PUBLIC_BUNDLE_CONTRADICTION_SURFACING` | v1 frozen |
| `NEXT_PUBLIC_BUNDLE_SEQUENCE_SURFACING` | 2 |
| `NEXT_PUBLIC_BUNDLE_SCOPE_SURFACING` | 3 |
| `NEXT_PUBLIC_BUNDLE_STRENGTH_SURFACING` | 4 |
| `NEXT_PUBLIC_BUNDLE_MULTI_INCIDENT_SURFACING` | 5 |
| `NEXT_PUBLIC_BUNDLE_TRIANGULATION_SURFACING` | 6 |
| `NEXT_PUBLIC_BUNDLE_CLIENT_SAFE_SURFACING` | 7 |

### Phase 2 gate (all modules)

```powershell
npx tsx scripts/bundle-contradiction-tier-gate.ts
npx tsx scripts/bundle-contradiction-extract.test.ts
npx tsx scripts/case-routine-gate.ts
```

Report: `artifacts/casebrain-qa/contradiction-tier-gate/report.json`

| Tier | Cases |
|------|--------|
| **A** | Paige, Neil, thin; sequence; scope; strength; multi-incident; triangulation (MG11 vs CCTV) |
| **B** | Gold no-false-positive (Ella, Sam, Ashleigh) + 80 thin corpus manifests |

### Final eval (one run when stack complete)

**Done 2026-06-21:** 2,200/2,200 pass (`npx tsx scripts/strategy-corpus.ts --count 2200 --split all`). Fixes: proof-map link IDs on provisional maps; charge-zone motoring detection in ledger. Report: `artifacts/casebrain-auditor/latest/strategy-corpus/`.

## Layer 6 — Offence coverage (family → offence-specific)

**Today:** `pilot-workflow.ts` uses **family profiles** (fraud, violence, motoring, generic) — not full offence-by-offence objects.

**Principle:** Expand from **pilot uploads**, not a blind 30-offence build. Each tranche: profile → disclosure pack → route weights → Tier A gate case → freeze.

### Phase 6A — Already covered (families)

| Profile | Typical matters |
|---------|-----------------|
| `violence_domestic_assault` | Paige-type ABH/domestic |
| `fraud_account_control` | Neil-type fraud |
| `generic_motoring_provisional` | Ella-type thin motoring |
| `generic_serious_violence_provisional` | GBH / s.18–s.20 shaped |
| `pwits_phone_attribution` | Phone / attribution |
| `robbery_identification` | ID-led robbery |

### Phase 6B — Offence tranches (build when pilot or eval demands)

| Tranche | Offences | Deliverables |
|---------|----------|--------------|
| **B1 Violence** | s.47 ABH, s.20 GBH, s.18 GBH, assault by beating | Disclosure pack, theory/risk/opp templates, battleboard route weights, 1 Tier A case each |
| **B2 Property** | Theft, burglary, robbery (full), criminal damage | Same |
| **B3 Public order** | s.4, s.4A, s.5, affray, bladed article | Same |
| **B4 Specialist** | Harassment, stalking, coercive control, sexual (later) | Same — only with consent + redacted pilots |

**Not blocking Module 5.** Start B1 when first firm uploads violence-heavy caseload beyond Paige.

## Layer 7 — Confidence stack (H1–H6)

**Goal:** Confidence by layers — not “solicitor-perfect on every line by automation alone.”

**Limit (honest):** Level 1 2,200 scan catches red flags and repeated patterns. It cannot certify every case line-by-line. Proper proof = **2,200 auto-scan + golden truth-key pack + worst50 human review + solicitor feedback loop**.

**Frozen:** Brain 1, battleboard core, chase core, Guardian, offence routing — presentation, trust UI, and verification only.

**Preferred changes:** reports, tests, truth keys, finalisation, UI trust, copy/export controls, feedback, audit.

### H1 — Safety / weirdness ✅

Guardian, Brief Plan, playbooks, Partner Score, Weirdness Detector, anchor fixes. Level 1: **2,200 / 2,200**, 0 dangerous.

### H2 — Display polish + verification ✅

| Track | Status |
|-------|--------|
| P1 chase finalisation | Prod |
| P2/P3 display polish | Prod |
| Golden 102 runnable, 0 fail | Gate PASS |
| Truth-key v2 | ~99% coverage |
| CB-FRESH Taylor/Jordan | Layer 7 PASS WITH MINOR WARNINGS |
| Known polish | `duplicate_chase_label` — not pilot-blocking |

### H3 — Trust layer ✅ **complete**

Answer the solicitor’s five trust questions on-screen:

1. Where did this come from?
2. Is it served or only mentioned?
3. Can I send this Chase wording?
4. Will this embarrass me in court?
5. Can I rely on this quickly before a hearing?

**H3 hard rule:** If a line cannot show source state, it cannot be marked safe to send.

| # | Work | Status |
|---|------|--------|
| 1 | Matter confidence header | ✅ chunk 1 prod |
| 2 | Source-state badges + badge cap | ✅ chunk 2 prod |
| 3 | Copy-safe controls | ✅ chunk 1 prod |
| 4 | Sendability labels | ✅ chunk 2 prod |
| 5 | Don’t Say / unsafe box | ✅ chunk 2 prod |
| 6 | Feedback capture foundation → Bad Output Memory | ✅ chunk 3 prod (`4735efa`) |

### Coverage principle (all phases)

Do not claim CaseBrain certifies every criminal case perfectly.

- Common types → useful Today / Chase / Summary
- Thin, messy, unusual, expert-heavy → PROVISIONAL / NEEDS REVIEW / BLOCKED FROM SENDABLE
- “I don’t know safely yet” is valid output
- Wider coverage via **safe fallback**, not fake certainty

Must support / test broad profiles: harassment, AEW/BWV, custody/PACE, violence s18/s20, drugs/PWITS, motoring/SJP, fraud, robbery/ID, sexual/ABE (caution), perverting justice, mixed family, thin bundle, referred-only, multi-defendant, OCR-poor, large bundle.

### H4 — Real-world confidence ⏳ **in progress**

**Principle:** Test by shape, not identity — **Criminal Bundle Simulator Library** (fake/anonymised bundles; no real personal data; no Brain edits).

**Simulator:** v1 locked (30) + v1.1 (7) + v2 (38) = **75 cases**, combined gate **0 blocking**.

| # | Work | Status |
|---|------|--------|
| 1 | Apply trust feedback DB migration | ✅ |
| 2 | Export/copy gate (golden 102) | ✅ prod green |
| 3 | Fresh-account smoke every deploy | ✅ ongoing |
| 4 | Account/permission smoke | ✅ prod 0 fail |
| 5 | Simulator manifest v1 — 30 cases | ✅ locked |
| 6 | Simulator pack v1 | ✅ |
| 6b | v1.1 serious supplement (+7) | ✅ accepted |
| 7 | Expand simulator **37 → 75** | ✅ combined gate 0 blocking |
| 8 | Worst50 + simulator → Bad Output Memory | — |

**Docs:** `docs/h4/H4_SIMULATOR_LIBRARY.md` · `docs/h4/H4_BUILD_ORDER.md` · `docs/h4/H4_SIMULATOR_V2_PLAN.md`

**Each simulator case combines:** offence profile · evidence pattern · PDF/layout problem · legal/safety trap · truth key · expected Today/Chase/Summary · must-not-say / blocking rules.

**Simulator gate (with golden 102 + Level 1 2,200):**

- **0 dangerous fails** on simulator pack; polish → review queue
- **Blocking:** wrong-family bleed · referred-as-served · missing-as-proved · unsafe win language · court-in-CPS-chase · safe-to-send-without-source-state · raw OCR in sendable copy · multi-defendant confusion as fact

**Do not:** scrape real bundles · use confidential client data · touch Brain 1 / frozen cores

### Presentation backlog (not H4 — Ged chooses)

**Five-answers UI simplification** — same power, lower mental load: Bundle Review · Court Prep · CPS Chase · Matter Brief · Source Map · Documents. Spec: `docs/backlog/UI_SIMPLIFICATION_FIVE_ANSWERS.md` — **do not start until Ged names it.**

### H5 — Top-tier solicitor workstation

**Do not build until H3 and H4 core gates are substantially complete.**

**Build in priority order** (not all at once):

1. Evidence Trace View  
2. **Defence Decision Board** *(locked future — spec: `docs/h5/H5_DECISION_SUPPORT.md`)*  
3. **Advice Change Radar** *(locked future — pairs with Decision Board; same spec)*  
4. 20-Minute Hearing Mode  
5. Export Pack  
6. Versioned Output  
7. Feedback Console  
8. Audit Log  
9. Re-run Diff  
10. Confidence Dashboard  

**Decision support (items 2–3):** solicitor-safe strategic options and “what would change the advice” when new evidence arrives — source-linked, provisional, no outcome prediction. After trace view; before/alongside hearing mode; feeds hearing mode and disclosure timetable builder.

Also scoped: line-level claim tags, sendability gate, disclosure timetable builder, Bad Output Memory v2, firm admin, no-send watermark.

### H6 — Later power features (after H5 substantial)

Do not start until H3/H4/H5 core complete. Makes CaseBrain sticky and firm-specific:

1. Solicitor mode editing (accept/edit/reject/lock wording)  
2. Firm style memory (tone — never override Guardian)  
3. CPS / opponent response tracker  
4. Hearing outcome tracker  
5. New evidence re-analysis  
6. Solicitor-approved template library  
7. Billing / time-saved proof  

**H6 acceptance:** Does not weaken safety; all memory editable/auditable; versioning intact.

### Design-partner gate (Layer 8)

**No firm until:**

- H3 complete  
- H4 complete enough (export/copy + simulator pack v1)  
- H5 core workstation started or scoped  
- Golden 100+ no dangerous fails  
- Level 1 2,200 no dangerous critical  
- Worst50 no repeated dangerous cluster  
- Fresh-user smoke green  
- Export/copy checks green  
- Trust labels/source states visible  
- Feedback capture working  

Then: one controlled firm, supervised, 10–20 matters, weekly structured feedback.

## Layer 8 — Commercial pilot (3–5 firms)

**Goal:** Prove daily use and UX trust in real firms — after H3–H6 gates where applicable.

### Entry bar (start inviting firms when)

- [x] Modules 5 + 6 live on prod  
- [x] Module 7 client-safe shipped  
- [x] 2,200-case eval PASS  
- [x] Layer 4 cold-start on S1 PASS  
- [x] CB-FRESH-001/002 adversarial audit PASS (attribution + BWV shapes)  
- [x] Paywall/trial clarity spot-check  
- [x] **H2 Verification** — golden 100, truth-key coverage, worst50 discipline  
- [ ] **H3 Trust layer** — confidence header, badges, copy-safe, feedback (chunk 1 in progress)  
- [ ] **H4 Real-world confidence** — export/copy gate, simulator library v1 (30 cases)  
- [ ] **H5 Workstation** — prioritised slices (trace → hearing mode → export pack…)  
- [ ] **H6 Power features** — after H5 substantial  

**No design-partner trial until Layer 8 design-partner gate is met.**

### Per firm

| Item | Target |
|------|--------|
| Firms | 3–5 |
| Cases per firm | 10–20 (mix of offence families) |
| Feedback | Weekly structured PASS/FAIL (Summary, Today, Chase, safety) |
| Kill switch | Any module off within minutes if misbehaves |
| Success | Solicitor would use output in conference / chase letter without rewrite |

### Co-pilot QA checklist (copy per case)

1. Theory — provisional, contradictions present when papers support, no REQ leakage  
2. Risks vs opportunities — separated, no chase dump in theory  
3. Chase — actionable, client-safe wording  
4. Today — say this / don’t overstate  
5. **Explicit silence** — if module quiet, confirm papers don’t support a pair (not a bug)  

## Definition of done (commercial v1)

| Criterion | Status |
|-----------|--------|
| Modules 1–7 live + gated | **7/7** |
| 2,200-case eval | **PASS** (2200/2200) |
| Cold-start prod (S1) | **PASS** |
| CB-FRESH adversarial audit | **PASS WITH MINOR WARNINGS** (safe; proof layer incomplete) |
| H2 Verification | ✅ PASS (WARNING polish-only) |
| H3 Trust layer | ⏳ **IN PROGRESS** (chunk 1) |
| H4 Real-world confidence | ⏳ |
| H5 Workstation | ⏳ |
| H6 Power features | ⏳ Later |
| Design-partner firm (1) | ⏳ After H3–H5 gates |
| 3–5 firms completed pilot | ⏳ |
| Layer 4 UX/reliability must-haves | **Done** (paywall copy ✅) |

## Out of scope

- Real client data / live listings
- Training model on bundles
- Legal advice / compliance certification
