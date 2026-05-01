# Full plan: fix disclosure / chat properly (master backlog)

Single document merging the earlier phased backlog with the **architecture** direction (structured MG6, question routing, no waffle). **Simple rule:** move **facts and lists** out of free‑text LLM generation wherever you can; keep the LLM for **format, explanation, and tactical** questions only.

**Honest ceiling:** “Once and for all” only holds if **parsing and validation** stay strong on real PDFs. Bad parse = wrong table (harder to spot than waffle). Plan includes validation for that.

---

## Phase 0 — Ship the video (when needed)

**What:** Record demos with bundles and prompts you trust; redo weak clips.

**Why:** Calendar and morale. Partial fixes already in the repo still help until the backbone lands.

---

## Phase A — Facts vs posture (product rules)

**What:** Everywhere in product copy and dev rules: **bundle = what the papers say**; **database / snapshot = posture** (stance, strategy, stage). If they conflict, **surface both** instead of merging silently.

**Why:** Stops “strategy said X but MG6 said Y” class bugs at the idea level.

---

## Phase B — Context: never feed generic disclosure templates

**What:** Remove or neutralise anything that looks like a **generic CPS shopping list** (custody record, fire report, footwear, interview recording, etc.) **unless those words appear in the file or structured extract**. Prefer **not injecting** over “inject then detect.”

**Why:** Stops the model **seeing** fiction before it answers. Detection is backup, not the main hygiene (see Phase I).

**Status:** Partly addressed (`evidence-context`, chat labelling); keep tightening until nothing in the pipeline impersonates a full MG6 schedule.

---

## Phase C — Split question types (routing)

**What:** Classify the user question (rules + light model or keywords first). Route to a **source**, not always one chat path:

| Kind of question | Primary source | LLM role |
|------------------|----------------|----------|
| Disclosure / served / outstanding / MG6 checklist | Structured MG6 (when available) + bundle text fallback | **Format only**, or **none** — see Phase E |
| Charge / offence wording | Charge extract + bundle | Format / explain |
| Allegation / Crown narrative | MG5 (+ charge) | Tight, paper‑linked |
| Interview limbs / summary | Interview summary section | **Fixed output shape** — see Phase G |
| Exhibits / refs | Exhibit list in bundle | Copy / format |
| Tactics / pressure / “what’s the angle” | Snapshot + bundle tensions | LLM allowed, still grounded |

**Why:** Stops one prompt trying to be everything. **Changing where the answer comes from** is the core fix ChatGPT described.

---

## Phase D — MG6 as structured data (the backbone)

**What:** Parse MG6 (initial disclosure schedule) from bundle text (upload pipeline or on‑demand) into **structured rows**, e.g.:

- `category` (MG5, MG11, CCTV, 999, CAD, Forensics/medical, Continuity/chain, …)
- `served_initial` (or equivalent column text)
- `awaiting_or_note` (second column — **never merged** with served in storage)

**Why:** **Missing rows** (e.g. forensics + continuity) were a **completeness** failure — often easier to guarantee from **data** than from prose.

**Deliverable:** JSON (or DB) the app can render without inventing categories.

---

## Phase E — Disclosure answers: code‑first path (hard stop for lists)

**What:** For routed **disclosure / MG6** questions:

1. If structured MG6 exists and validates (Phase F) → **build the bullet list in code** from rows (plain English allowed, but **only** from cell text).
2. Optionally pass that string through LLM **only** to polish wording — **no new rows, no new categories**.
3. If no parse → **do not** guess a full schedule: return **“Not stated in the materials”** / **insufficient detail to list MG6 rows** (and optionally trigger re‑extract).

**Why:** This is the **“stop asking the AI to remember the file”** step — the list **is** the file, structured.

---

## Phase F — Parser validation & thin bundles

**What:**

- **Validate** parse output: e.g. minimum row count, required category labels for Northshire template, non‑empty columns where the template expects two cells.
- If validation fails → **no confident MG6 list**; show **warning** / incomplete state + honest short message (aligns with “thin bundle” behaviour).

**Why:** Prevents **confident wrong tables**. Distinguishes **AI waffle** from **pipeline dropped rows**.

---

## Phase G — Output shape (kills essay fluff)

**What:** Enforce **templates** per answer type (code or strict post‑constraints):

- **MG6:** One line per category: `Category -> served (initial); awaiting / note` — no extra “this limits the prosecution…” unless user asked for tactical commentary.
- **Interview (four limbs):** Four bullets **from summary wording only**; optional **single** “why it matters” line **only** if allowed and still grounded.

**Why:** Fixes **padding** and **invented tactics** while keeping correct facts.

---

## Phase H — Stricter prompts for paths that still use the LLM

**What:** For questions that remain LLM‑first (tactics, mixed queries), system + user rules: bundle excerpt priority, no generic lists, short answers, “not stated” when absent.

**Why:** Cheap layer for everything not yet behind Phase E.

---

## Phase I — Detectors + rewrite (permanent backup)

**What:** Keep post‑checks (invented phrases not in bundle, strategy label mismatches, etc.) and targeted rewrite when violations fire.

**Why:** Safety net when routing misfires, parser gaps, or user asks ambiguous questions. **Not** the primary disclosure mechanism once Phase E is live.

**Status:** Partly implemented in defence‑plan chat.

---

## Phase J — LLM charter (what it is allowed to do)

**What:** Document and enforce in code review: LLM may **explain, summarise tactically, rephrase** — it must not **create rows, categories, exhibit codes, or “facts”** for disclosure/MG6/interview factual modes when structured or verbatim sources exist.

**Why:** Aligns team and future features with one architecture story.

---

## Phase K — “Safe to run” / mixed factual + judgment (later)

**What:** Either narrow the product promise or split **factual** (from MG6 + file) from **judgment** (risk language), possibly structured factual half first.

**Why:** Hardest question type to keep perfect after MG6 is solid.

---

## Execution order (recommended)

1. **A** — facts vs posture (quick, clarifies everything else).  
2. **B** — stop feeding generic templates (finish what’s started).  
3. **C** — question routing (unlocks E without hacks).  
4. **D** — MG6 parse → structured store.  
5. **F** — validation + thin‑bundle behaviour (alongside D, not afterthought).  
6. **E** — code‑first disclosure answers.  
7. **G** — output shapes (MG6 + interview).  
8. **H** — prompt tightening for remaining LLM paths.  
9. **I** — keep/extend detectors.  
10. **J** — charter / docs for maintainers.  
11. **K** — safe‑to‑run / mixed questions when ready.

**Parallel:** Phase 0 whenever you need a marketing capture.

---

## One‑line truth (shared with external “ChatGPT plan”)

> **Stop asking the model to invent the schedule — build the schedule from structured MG6 (or say the materials aren’t enough), then only let the model polish or explain.**

---

## Acceptance tests (examples)

- **MG6 list:** Every category row present in the fictional Northshire template appears; **forensics/medical** and **continuity/chain** never dropped when present in source.  
- **999:** Extract vs full master wording matches cells, not essay.  
- **Interview:** Four limbs, no merged “no comment” into denial; no prosecution/defence strategy sentences not in summary.  
- **Disclosure question with bad parse:** No fabricated full schedule; user sees incomplete / not stated, not confident fiction.
