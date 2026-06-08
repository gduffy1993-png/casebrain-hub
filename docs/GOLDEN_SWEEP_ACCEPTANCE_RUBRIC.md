# In-app golden sweep — acceptance rubric (human + regression)

This document describes the **Defence Plan bulk “Golden sweep 10”** strings shipped in code (`lib/eval-golden-sweep.ts`). It is **not** the same list as `docs/fictional-golden-10/GOLDEN_10_QUESTION_PACK.md` (that pack is a separate PDF-facing battery).

**What “pass” means here:** answers are **faithful to the disclosed material the system used**, **use the right specialised route** where we enforce one, and **do not silently degrade** (timeouts, generic fallbacks, duplicate fingerprints across cases). This is **not** a guarantee of trial outcome or legal correctness in court — that still needs professional review on real work.

**What you already have in product:** `/eval` sweep review, route-drift warnings, collapse warnings, weak-row heuristics, and **Download debug bundle** (includes `sweep_observability` when there are eval rows). Use a **debug bundle JSON** plus this page when reporting issues.

**Human run log (append each sweep):** [`GOLDEN_SWEEP_REGRESSION_LOG.md`](./GOLDEN_SWEEP_REGRESSION_LOG.md).

---

## Global red flags (any question)

- HTTP not 200, or answer text matches timeout / abort patterns (“timed run prevented…”, browser limit, etc.).
- `route_tag` in `GOLDEN_FALLBACK_ROUTE_TAGS` (`lightweight_eval_grounding_fallback`, `lightweight_eval_interpretive_sweep_grounding_fallback`, `full_chat_ungrounded_fallback`) — investigate grounding or gating.
- Answer very short and vague **and** not on a `strict_*` route (see `isProblemSweepRow` in `lib/eval-sweep-review.ts`).
- **Semantic collapse:** many cases share the same answer fingerprint for the same question — often pipeline or prompt regression, not “every case really agrees.”
- **Route drift warnings** for a question that should always hit one strict route (see below).

---

## Per-question intent and checks

Exact question text (do not paraphrase in tests; wording is stable on purpose).

### Q1 — Primary allegation (charge / bundle wording)

**Question:** What is the primary allegation in one sentence using only the charge/bundle wording?

**Routing expectation:** `strict_primary_allegation` for every row in a healthy sweep.

**Pass:** One sentence; tracks charge sheet / indictment / summary wording present in the bundle; no new facts.

**Fail:** Invented elements, wrong offence, generic “assault” line when the charge is specific, or route not strict when the bundle supports it.

---

### Q2 — MG6 served / outstanding

**Question:** What does MG6 say is served and outstanding?

**Routing expectation:** `strict_mg6`.

**Pass:** Tied to MG6 table or schedule lines in the material; distinguishes served vs outstanding where the MG6 text does.

**Fail:** Invented disclosure states, or vague “disclosure is ongoing” without mirroring MG6 language when MG6 is in the slice.

---

### Q3 — Missing / incomplete evidence

**Question:** What evidence appears missing or incomplete right now?

**Routing note:** Interpretive; should **not** sit on raw `lightweight_eval` / grounding fallback in bulk fast-eval if headers are correct (see `GOLDEN_SHOULD_AVOID_LIGHTWEIGHT_EVAL`).

**Pass:** Points to concrete gaps (statements, exhibits, schedules, unused material) grounded in what is in the bundle excerpt or case snapshot.

**Fail:** Boilerplate “insufficient disclosure” with no case-specific hooks when the bundle lists concrete items.

---

### Q4 — Interview

**Question:** What was said in interview?

**Routing expectation:** `strict_interview`.

**Pass:** Accurate paraphrase or quotes from interview summary / transcript lines in the bundle; “no interview material in excerpt” only if that is true.

**Fail:** Invented admissions/denials, or narrative not traceable to interview text.

---

### Q5 — Exhibits list

**Question:** List every exhibit code exactly as printed and the bundle reference ID.

**Routing expectation:** `strict_exhibit`.

**Pass:** Codes match bundle typography (EX-…, NS-CPS-…, etc.); no placeholders; ordering may follow bundle.

**Fail:** Missing codes, invented codes, merged lines that drop references.

---

### Q6 — Inconsistencies / conflicts

**Question:** Are there any inconsistencies or conflicts in the evidence?

**Routing note:** Interpretive; same lightweight-eval expectations as Q3.

**Pass:** Names concrete tensions (witness A vs B, MG5 vs MG11, timeline vs CCTV) when present; says clearly when nothing stands out in the excerpt.

**Fail:** Generic “there may be inconsistencies” with no anchors, or hallucinated contradictions.

---

### Q7 — Prosecution must still prove

**Question:** What must the prosecution still prove in this case?

**Routing note:** Interpretive.

**Pass:** Elements and burdens tied to this charge and this bundle (what is disputed, what is thin).

**Fail:** Textbook law lecture with no case linkage.

---

### Q8 — Biggest weakness — prosecution

**Question:** What is the single biggest weakness in the prosecution case?

**Routing note:** Interpretive.

**Pass:** One clear thesis, evidence-linked (disclosure, ID, continuity, credibility, etc.).

**Fail:** Vague “case is weak” or multiple unrelated weaknesses framed as one.

---

### Q9 — Biggest weakness — defence

**Question:** What is the single biggest weakness in the defence case?

**Routing note:** Interpretive.

**Pass:** Honest, case-specific risk (e.g. adverse witness, strong continuity, bad character) grounded in materials.

**Fail:** Generic “need more disclosure” as the only content when the question asks for defence weakness.

---

### Q10 — Next 24 hours

**Question:** What should be done in the next 24 hours?

**Routing note:** Interpretive.

**Pass:** Concrete procedural / tactical steps appropriate to stage (PTPH, initial, trial prep) and this file set.

**Fail:** Non-actionable platitudes.

---

## How to use this in practice

1. Run **Golden sweep 10** (or `/eval` golden) on your fictional set or a stable slice of cases.  
2. Download **debug bundle** (or eval JSON).  
3. Skim **global red flags**, then **per-question** using this rubric.  
4. If something fails, attach one bundle JSON in chat — engineers can align prompts/routes to these expectations.

When you change this rubric, update regression expectations and any human “gold notes” for fictional bundles so they stay in sync.
