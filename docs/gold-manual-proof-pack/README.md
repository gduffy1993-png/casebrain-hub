# Gold Manual Proof Pack — Specification

**Status:** Spec and templates only — **no implementation in this branch.**  
**Branch:** `feature/gold-manual-proof-pack-spec`  
**Scope:** Docs and templates for 20–50 **manually checked** criminal bundle cases.

---

## Purpose

This pack defines how CaseBrain builds and maintains a **gold manual proof set**: controlled criminal bundles where a supervising solicitor (or designated reviewer) has checked what the bundle actually contains, what is genuinely missing, and what CaseBrain **should** say across each output surface.

This is **not** automated audit output, **not** solicitor-reviewed proof in production, and **not** a claim of real-world accuracy. It is a **gold manual review** framework: structured expectations against controlled bundles, with **solicitor review required** before any case is promoted to gold status.

---

## What this pack is for

| Use | Description |
|-----|-------------|
| Controlled regression | Compare CaseBrain outputs against human-checked expectations |
| False-positive triage | Record where CaseBrain over-warns, under-warns, or confuses surfaces |
| Coverage planning | Ensure offence families and evidence types are represented |
| Pilot readiness | Select demo and shadow-pilot matters with known truth states |
| Solicitor shadow work | Pair with the Solicitor Shadow Pilot Pack for structured review sessions |

---

## What this pack is **not**

- Not a substitute for live matter handling or legal advice
- Not committed client data, real URNs, or real police references
- Not proof that solicitor review has already happened (unless recorded per case)
- Not tied to v9 scale runs, messy-PDF audit branches, or automated proof receipts alone
- Not an engine specification — no pipeline ids, internal enums, or proprietary logic

---

## Folder contents

| File | Role |
|------|------|
| [GOLD_CASE_TEMPLATE.md](./GOLD_CASE_TEMPLATE.md) | Per-case record: bundle, truth, expected outputs, reviewer notes |
| [TRUTH_STATE_TEMPLATE.json](./TRUTH_STATE_TEMPLATE.json) | Machine-readable truth state for a gold case |
| [EXPECTED_OUTPUT_TEMPLATE.md](./EXPECTED_OUTPUT_TEMPLATE.md) | Expected lines per surface (court, CPS, client, receipt) |
| [FALSE_POSITIVE_REVIEW_FORM.md](./FALSE_POSITIVE_REVIEW_FORM.md) | Structured false-positive and quality review |
| [GOLD_PACK_SCORING.md](./GOLD_PACK_SCORING.md) | How to score pass, partial, fail, and hold |
| [GOLD_PACK_COVERAGE_TARGETS.md](./GOLD_PACK_COVERAGE_TARGETS.md) | Minimum coverage across offence and evidence families |

---

## Gold case lifecycle

```text
1. Select controlled bundle (fictional or anonymised local — never commit real data)
2. Complete GOLD_CASE_TEMPLATE + TRUTH_STATE_TEMPLATE
3. Run CaseBrain on the bundle (local or staging — outside this spec branch)
4. Complete EXPECTED_OUTPUT_TEMPLATE from manual bundle read
5. Compare actual output vs expected; complete FALSE_POSITIVE_REVIEW_FORM
6. Score per GOLD_PACK_SCORING; update coverage tracker
7. Promote to gold only when reviewer sign-off is recorded
```

---

## Per-case minimum record

Every gold case must document:

1. **Input bundle** — what was served, format, known defects (OCR, redaction, page order)
2. **Truth states** — present, partial, referred-but-absent, not-in-bundle, unknown
3. **Expected missing material** — what disclosure chase should (and should not) pursue
4. **Expected unsafe-to-say warnings** — where CaseBrain must not assert facts
5. **Expected court line** — hearing-safe, source-linked wording
6. **Expected CPS chase** — proportionate, non-duplicative requests
7. **Expected client summary** — plain English, no over-confidence
8. **Expected proof receipt** — provenance and safe-action anchors per line
9. **Source/page expectation** — document type, page or anchor, excerpt if helpful
10. **Reviewer notes** — date, reviewer role, open questions, hold reasons

---

## Claim discipline (mandatory)

Use only these framings in gold pack documentation:

- **Gold manual review** — human-checked controlled bundle
- **Controlled bundle** — fictional or anonymised; not live client matter
- **Solicitor review required** — before gold promotion or external demo use
- **Expected output** — what a careful read of the bundle supports
- **Review aid** — not legal advice, not production proof

**Do not:**

- Invent solicitor quotes or endorsements
- Invent reviewer outcomes before review is done
- Claim solicitor-reviewed proof has happened without a recorded sign-off
- Claim real-world accuracy or court-ready status
- Use real client names, addresses, URNs, or police references in committed files

---

## Target pack size

| Phase | Cases | Notes |
|-------|-------|-------|
| Minimum viable | 20 | At least one case per priority coverage family |
| Full pack | 50 | Depth across mixed bundles, layout defects, and surface splits |
| Holdout | 5–10 | Not used for tuning; milestone check only |

See [GOLD_PACK_COVERAGE_TARGETS.md](./GOLD_PACK_COVERAGE_TARGETS.md) for family quotas.

---

## Relationship to other work

| Other chat / branch | Relationship |
|---------------------|--------------|
| Chat 1 — v9 scale / messy-PDF audit | Separate; do not merge or depend on v9 artifacts |
| Chat 2 — Plea / Trial Pressure Map | Gold cases may supply pressure signals; separate spec |
| Chat 4 — Solicitor Shadow Pilot Pack | Shadow sessions use gold cases as review scripts |
| Chat 5 — Proof Receipt UI | UI spec consumes receipt shape defined here |
| Bundle fidelity set | Overlapping truth-key idea; gold manual pack adds full output expectations |

This pack **does not** modify Brain 1, Guardian, chase core, export builders, Supabase, auth, UI routes, deploy config, or audit runners.

---

## Local storage (gitignored)

Gold case bundles and run outputs should live outside committed docs, for example:

```text
artifacts/casebrain-gold-manual/local/
  gm-001-phone-attribution-thin/
    bundle-text.md          ← gitignored
    truth-state.json        ← copy from template; gitignored if real-adjacent
    expected-output.md
    review-form.md
    run-output/             ← CaseBrain output snapshot; gitignored
```

Only **templates** and **specification** live in `docs/gold-manual-proof-pack/`.

---

## Acceptance (pack-level)

A supervising solicitor can pick any gold case folder and, within **ten minutes**, understand:

- what the bundle contains and what is missing;
- what CaseBrain should say on each surface;
- whether the latest run matched expectations; and
- what false-positive issues remain open.

---

## Document control

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Created | 2026-07-09 |
| Author | CaseBrain product spec |
