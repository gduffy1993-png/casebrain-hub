# Strategy models discussion (Copilot ideas vs current CaseBrain)

**Context:** Copilot suggested five alternative paradigms for building “fight strategy” in CaseBrain. This doc is **discussion and planning only** — no code or commitment to build any of them until we’ve stabilised the current pipeline and agreed direction.

---

## Copilot’s five models (short recap)

1. **Dynamic Burden Map (DBM)** — Live map of what the prosecution must prove; defence strategy = which burdens are weak / unsupported / can be collapsed or shifted. Offence-agnostic, evidence-linked table (Burden | Evidence | Strength | Defence Leverage).

2. **Evidence Pressure Points (EPP)** — Strategy as “5 pressure points” in the prosecution case: missing docs, weak inferences, disclosure gaps, factual uncertainty, procedural vulnerability. “Where’s the weakness / leverage / risk?”

3. **Hearing-Ready Strategy (HRS)** — Strategy built by hearing: first appearance → case management → trial → sentence. Each hearing has concrete actions (e.g. request fire report, push disclosure, cross-exam themes, mitigation bundle). Practical and procedural.

4. **Defence Narrative Builder (DNB)** — Strategy around the defence story: uncontested facts, defence vs prosecution narrative, narrative conflicts, vulnerabilities, pivot points (e.g. accidental vs deliberate; conflict = no ignition source).

5. **Risk–Outcome Matrix (ROM)** — Decision support: worst / realistic / best case; evidence required; defence actions. “What’s the safest path?” rather than doctrinal attack routes.

---

## How this fits CaseBrain today

- We already have: **offence resolution** (charges → matter → bundle), **routes** (act denial, intent denial, identification, procedural disclosure, weapon/causation), **legal tests / doctrine** (judge lens, judge reasoning), **disclosure items**, **strategy commitment** (fight / charge reduction / outcome management), **phase 2 plan** (steps, tools).
- The current model is **route + doctrine + triggers**: pick a primary strategy, see attack order and legal tests, see “what we’re waiting on” and next actions. It’s offence-aware (we just fixed arson vs GBH) but still **route-centric** and partly **template-driven** (e.g. beast pack, playbooks in StrategyCommitmentPanel).

---

## View on each model

### 1. Dynamic Burden Map (DBM)

- **Verdict:** Strong fit with how barristers/solicitors think and with our existing **offence elements** (we already have “what the prosecution must prove” per offence: s18 = injury, causation, identification, specific intent; arson = property, damage by fire, intent/recklessness, lawful excuse, identification).
- **Overlap with now:** We already have element-level support (weak/some/strong) and gaps; we don’t currently surface it as a **single “burden map” table** with “Defence Leverage” per row. DBM would be a **different presentation and framing** of the same underlying data (elements + evidence + gaps).
- **Pros:** Offence-agnostic, works for any charge, explainable, no speculation if we only show what we infer from bundle + offence def. **Cons:** Requires element mapping and evidence→element linkage to be robust (we’re not fully there yet).

### 2. Evidence Pressure Points (EPP)

- **Verdict:** Very close to what we already do with **disclosure items**, **missing evidence**, and **route “gaps”**. “Pressure points” = missing docs, weak inferences, disclosure gaps, procedural vulnerabilities — we already list these in disclosure panels, safety panel, and route reassessment triggers.
- **Difference:** EPP frames strategy as “here are the N pressure points” rather than “here are the routes.” It’s a **reframe**, not a new engine. We could **rename or add a “Pressure points” view** that aggregates: outstanding disclosure, weak elements, procedural risks, factual uncertainties — all in one list with “leverage” or “action” per point.

### 3. Hearing-Ready Strategy (HRS)

- **Verdict:** Very useful and **complements** the current model. We already have hearings (from criminal_hearings), phase 2 steps (disclosure, intent, charge_reduction, plea, trial), and “next hearing” in the UI. We do **not** currently drive strategy **by hearing type** (first appearance vs PCMH vs PTPH vs trial vs sentence) with tailored “what to say/do here.”
- **Pros:** Familiar, action-driven, matches how solicitors work. **Cons:** Needs clear stage/hearing-type derivation and content per hearing type (could be playbook-driven later). Fits well with **Phase 4** in the plan (stage, timeline, disclosure).

### 4. Defence Narrative Builder (DNB)

- **Verdict:** Powerful but **higher lift**. It requires: uncontested facts, defence narrative, prosecution narrative, conflicts, vulnerabilities, pivot points. We don’t currently have “narrative” as a first-class object; we have routes, elements, and disclosure. DNB would need either (a) structured narrative fields (solicitor or AI) or (b) inference from bundle + position. Good **longer-term** direction; not a quick win.

### 5. Risk–Outcome Matrix (ROM)

- **Verdict:** Useful as **decision support**, not a replacement for “how to fight.” We already hint at outcomes (e.g. charge reduction, acquittal, mitigation). ROM would make “worst / realistic / best” and “evidence required / defence actions” explicit in a matrix. Could sit alongside routes or DBM as a **second view** (e.g. “Outcomes” or “Scenario planning” tab).

---

## Suggested order (after Phase 1 is stable)

1. **Stabilise and verify** (Phase 1) — migrations, pipeline, offence + source in UI, arson vs GBH behaviour. No new strategy architecture until this is done.

2. **Clarify what we have** — Document current “strategy output” as: offence → elements + support + gaps → routes (viable/risky/blocked) → legal tests → disclosure list → next actions. That’s already a **partial DBM** (burdens = elements, strength = support, leverage = route + gaps). We could **expose it as a Burden Map** (one new view) without changing the engine.

3. **Pressure points as a view** — Aggregate “pressure points” from: outstanding disclosure, weak/none elements, procedural risks. One list with “why it matters” and “defence leverage.” This is **EPP as a reframe** of existing data.

4. **Hearing-ready layer** — Once stage/hearing type is reliable (Phase 4), add “For this hearing: do/say this” from playbooks or rules. **HRS** as an additional layer on top of routes/burden map.

5. **Narrative and ROM later** — DNB and ROM are stronger as Phase 2+ features once we have stable elements, disclosure, and hearings.

---

## Summary

- **Copilot’s ideas are good** and mostly **complementary** to what we have: DBM and EPP are close to our current model (elements + disclosure + routes), reframed; HRS fits Phase 4 (workflow/hearings); DNB and ROM are good next horizons.
- **Don’t rebuild the engine yet.** First: Phase 1 stable, offence-specific strategy verified (including arson), then consider **one new view** (e.g. Burden Map or Pressure Points) that reuses existing data. Then hearing-based strategy; then narrative/ROM if we want to go there.
- **If we pick one “signature” direction:** Hearing-Ready Strategy (HRS) is the most distinctive and solicitor-friendly “next step” once we have stage and hearings in place; DBM/EPP make the current model clearer and more offence-agnostic without throwing away routes.

No code in this doc — planning only. When we’re ready to design one model in detail (e.g. DBM table schema, or HRS per-hearing structure), we can do that in a follow-up.
