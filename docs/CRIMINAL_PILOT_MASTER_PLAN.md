# Criminal pilot — master plan (merged)

**Status:** Layers 1–3 shipped. **Phase 1.5 closed** (Paige + Neil Summary PASS on prod). **Contradiction v1 frozen.** Phase 2 Tier A/B gate added.

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
| 2 | **Sequence engine** | Timeline order, travel-time, “who pushed first” |
| 3 | **Scope contradictions** | Charge period vs evidence window, “multiple” vs “one” |
| 4 | **Strength contradictions** | Severity vs injury vs CCTV behaviour |
| 5 | **Multi-incident reasoning** | Multiple dates, complainants, events |
| 6 | **Cross-evidence triangulation** | MG11 vs CCTV vs CAD vs BWV vs 999 |
| 7 | **Client-safe explanation engine** | Plain-English contradiction packaging (Section 6) |

Each module: `extract-*` → enrich War Room → `buildMatterBrief` routes lines to Theory / Risks / Opportunities. Env kill switch per module.

### Phase 2 gate (contradiction v1)

```powershell
npx tsx scripts/bundle-contradiction-tier-gate.ts
npx tsx scripts/bundle-contradiction-extract.test.ts
npx tsx scripts/case-routine-gate.ts
```

Report: `artifacts/casebrain-qa/contradiction-tier-gate/report.json`

| Tier | Cases |
|------|--------|
| **A** | Paige sectioned, Neil fraud, thin empty |
| **B** | Gold no-false-positive (Ella, Sam, Ashleigh) + 80 thin corpus manifests |

### Final eval (one run when stack complete)

Single 2,200-case factory pass checks: all contradiction types, sequence, scope, strength, multi-incident, triangulation, offence routing, Matter Brief assembly, safety surfaces, Today / Battleboard / Chase non-regression, kill switches.

## Out of scope

- Real client data / live listings
- Training model on bundles
- Legal advice / compliance certification
