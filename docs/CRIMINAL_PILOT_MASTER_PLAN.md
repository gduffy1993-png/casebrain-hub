# Criminal pilot — master plan (merged)

**Status:** Layers 1–3 shipped. **Modules 1–7 LIVE** on prod. **2,200 factory PASS**. **Cold-start S1 PASS**. **CB-FRESH Layer 7 PASS WITH MINOR WARNINGS** (2026-06-28). **H1 + H2 P1/P2/P3 display polish done.** **H2 Verification gate PASS (102 runnable, 0 fail, WARNING polish-only).** **Next: H3 Trust layer — no design-partner trial yet.**

**Decision (Ged, 2026-06-28):** Finish the proof layer before any firm sees the product. Protect first impression; do not waste firm time on avoidable polish.

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

## Layer 7 — Confidence stack (H2 / H3 / H4)

**Goal:** Confidence by layers — not “solicitor-perfect on every line by automation alone.”

**Limit (honest):** Level 1 2,200 scan catches red flags and repeated patterns. It cannot certify every case line-by-line. Proper proof = **2,200 auto-scan + golden truth-key pack + worst50 human review + solicitor feedback loop** (after controlled pilot).

**Frozen:** Brain 1, battleboard core, chase core, Guardian, offence routing — presentation, trust UI, and verification only.

### H2 — Golden + review queue ✅ (gate PASS — WARNING polish-only)

| # | Work | Target | Status |
|---|------|--------|--------|
| 1 | Golden pack growth | 50 → 75 → 100 | ✅ 102 runnable |
| 2 | Truth keys on golden cases | H2 v2 schema + backfill | ✅ 99% avg coverage |
| 3 | Review queue | worst50 classify dangerous / polish / gate noise | ✅ 0 dangerous in worst50 |
| 4 | Confidence report | ready / warning / blocked | ✅ **WARNING** (0 fail, polish-only) |

### H3 — Trust layer

| # | Work |
|---|------|
| 1 | Matter confidence header — safe / provisional / needs review; main issue; evidence coverage; next action; do-not-rely-yet reason |
| 2 | Source-state badges — served / referred only / missing / provisional / needs review |
| 3 | Copy-safe controls — Copy CPS chase / court line / client-safe summary (no court wording in CPS chase) |
| 4 | Feedback capture — flag wrong / unclear / unsafe → Bad Output Memory tests |

### H4 — Real-world confidence

| # | Work |
|---|------|
| 1 | Fresh-account smoke every deploy — new user, upload, Today/Chase/Summary, no dangerous output |
| 2 | Account/permission smoke — signup, firm, matter, upload, delete/archive, invited user if supported |
| 3 | Export quality — copied/downloaded Chase and Summary stay clean outside app |
| 4 | Red-team bad bundle pack — scanned PDFs, missing MG6, weird indexes, mixed offences, wrong names, referred-only BWV, duplicates, thin evidence |
| 5 | **100-case confidence run** before wider pilot — Level 1 2200 green, golden 100 no dangerous fails, worst50 no repeated dangerous clusters, fresh-user smoke green |

### H4 gate → then commercial pilot

Only after H2 + H3 + H4 gates:

- One controlled design-partner firm  
- Supervised use  
- 10–20 matters  
- Weekly structured feedback (Today / Chase / Summary / safety)

## Layer 8 — Commercial pilot (3–5 firms)

**Goal:** Prove daily use and UX trust in real firms — after confidence stack.

### Entry bar (start inviting firms when)

- [x] Modules 5 + 6 live on prod  
- [x] Module 7 client-safe shipped  
- [x] 2,200-case eval PASS  
- [x] Layer 4 cold-start on S1 PASS  
- [x] CB-FRESH-001/002 adversarial audit PASS (attribution + BWV shapes)  
- [x] Paywall/trial clarity spot-check  
- [x] **H2 Verification** — golden 100, truth-key coverage report, worst50 discipline  
- [ ] **H3 Trust layer** — confidence header, source badges, copy-safe, feedback memory
- [ ] **H3 Trust layer** — confidence header, badges, copy-safe, feedback capture  
- [ ] **H4 Real-world confidence** — deploy smoke, account smoke, export check, red-team pack, 100-case run  

**No design-partner trial until Layer 8 entry bar is met.**

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
| H2 Verification (golden + truth keys + worst50) | ✅ **PASS** (WARNING polish-only) |
| H3 Trust layer | ⏳ **NEXT** |
| H3 Trust layer | ⏳ |
| H4 Real-world confidence (100-case run) | ⏳ |
| 3+ offence tranches (6B) from real demand | ⏳ |
| Design-partner firm (1) | ⏳ After H2–H4 |
| 3–5 firms completed pilot | ⏳ |
| Layer 4 UX/reliability must-haves | **Done** (paywall copy ✅) |

## Out of scope

- Real client data / live listings
- Training model on bundles
- Legal advice / compliance certification
