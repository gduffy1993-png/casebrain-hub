# CaseBrain Defence Strategy Plan – Full Plan (Stages)

**This document is normative. Implementation must not exceed the scope of the active stage.**

**Rule:** No stage may introduce concerns belonging to a later stage.

**Stopping point (recommended):** Execute Stages 1–4, review, then decide on 5–6.

---

## Purpose

Make the Defence Strategy Plan clearer, less duplicated, and more actionable. Surface what the judge and prosecution are expecting and thinking, so solicitors can anticipate and prepare. Keep the app focused on finding strategy to win, without over-claiming.

**What stays:** CaseBrain top-of-case summary; strategy engine’s role; existing data and APIs except where we explicitly add or extend.

---

## Part 1 – Stages Overview

| Stage | Focus | Touches engine? |
|-------|--------|------------------|
| 1 | Wording only (display) | No |
| 2 | Duplication only | No |
| 3 | Layout + at-a-glance | No |
| 4 | Counsel-ready export | No |
| 5 | Strategy line + risks from engine | Yes |
| 6 | Attack order + case-specific fight | Yes |
| 7 | “What we’re waiting on” | New feature |
| 8 | “Strategy health” / “Still on track?” | New feature |
| 9 | Comms log + strategy–evidence links (optional) | New feature |

**Ordering:** Stages 1–4 = non-semantic (display only). Stages 5–6 = semantic (engine speaks). Stages 7–9 = orchestration / governance. Do not mix; complete each stage before moving on.

---

## Stage 1 – Wording only (display)

**What:** Fix how judge-style text and objectives are shown. No layout, no new features, no engine change.

**Changes:**
- **Judge softener:** Mechanical only – fix grammar, tense, duplication, modality. Not creative; no added legal nuance. Apply via **one function/helper** everywhere (no ad-hoc edits). Frame as “linguistic normalisation.”
- Full sentences only; no fragments (e.g. “whether causation between the act and the injury” → add “is established”).
- No “whether whether”; correct “is established” / “are established” for singular/plural.
- Apply softener everywhere judge-style text appears: Doctrine constraints, Required findings, Evidential limitations, Prosecution burden, Judge reasoning bullets, Red flags.
- **Objectives:** “Seek … or seek …” → “Seek … or obtain …”.
- **Label:** “Court Intolerances” → “Evidential limitations”.

**Guardrail:** Top strip (when added in Stage 3) must be read-only; “Based on disclosure as at [date]” must be boringly literal (provenance only).

**Result:** Same sections and layout; wording is clean and consistent. Strategy engine and data unchanged.

---

## Stage 2 – Duplication only

**What:** Remove repeated bullets; Supervisor Snapshot becomes a real summary. No engine touch.

**Changes:**
- **One bullet per distinct “issue for the court”** across all sections. Merge/dedupe so each legal issue appears once.
- **One row per distinct defence counter.** Define “same point” **narrowly** so we don’t over-merge:
  - Same **legal test** AND  
  - Same **evidential dependency** AND  
  - Same **safe wording**  
  Only then treat as one row. Otherwise keep separate (useful emphasis preserved).
- **Supervisor Snapshot:** Short summary only (e.g. 4–6 lines) or collapsible “Summary.” No full repeat of the bullets below. Snapshots that repeat content train people to ignore them.

**Result:** Fewer repeated lines; snapshot is a summary, not a copy. Wording from Stage 1 unchanged; layout and engine unchanged.

---

## Stage 3 – Layout and at-a-glance

**What:** Restructure the Defence Strategy Plan view only. No engine change.

**Changes:**
- **Top strip (read-only, no logic):**
  - One **strategy line** (e.g. “Charge reduction: accept harm, challenge intent; target s20.”). From existing data for now; can be from engine in Stage 5.
  - **Key date** (e.g. next hearing).
  - **“Based on disclosure as at [date]”** – boringly literal, provenance only.
- **Two columns below:**
  - **Left:** What the court has to decide – Required findings, Doctrine constraints, Evidential limitations (one conceptual block).
  - **Right:** What we say and do – Prosecution burden, Defence counters, Next actions, Hearing prep.
- **Strategy History:** Move off main view (e.g. “View history” link or separate tab). History is for audits, not day-to-day cognition.
- **CaseBrain top-of-case summary:** Unchanged.

**Result:** New layout; at-a-glance strip; history elsewhere. Wording and dedupe from Stages 1–2 unchanged. Sets up Stages 5–6 without refactors later.

---

## Stage 4 – Export

**What:** One counsel-ready export. No new strategy logic.

**Changes:**
- One-click export (PDF or Word) of the Defence Strategy Plan.
- Export must be a **projection of the view** – same structure, same wording, no “export-only” renderer. If it can’t export cleanly, it’s not actually clean.
- Content: strategy line and key date at top; deduped bullets; softened wording; no internal-only labels.

**Result:** Counsel-ready document from one click. Exports force discipline and boost credibility.

---

## Stage 5 – Engine: strategy line + risks (Track 2 start)

**What:** Engine produces two new outputs; UI shows them. First time the engine “speaks” in a new way.

**Changes:**
- **Strategy one-liner** from the engine (e.g. coordinator or defence-strategy builder). Must be **explainable from existing outputs** – synthesis, not new reasoning. Shown in at-a-glance strip and in export.
- **Risks & fallbacks** block from the engine (e.g. 3–5 bullets: “If X: Y. If Z: pivot to …”). Frames the system as responsive, not prophetic. Shown in one place on the plan.

**Guardrail:** Strategy line = synthesis only; no new reasoning yet. Keeps trust intact.

**Result:** Strategy line and risks block come from the system. UI already has a place for them (Stage 3).

---

## Stage 6 – Engine: attack order + case-specific fight

**What:** Sharper, more case-specific strategy content. Real step up in usefulness.

**Changes:**
- **Attack sequence** from the engine: “Primary attack: [X]. If not open or fails: [Y]. Then [Z].” Shown on the plan (e.g. right column).
- **Case- and evidence-specific** burden, counters, kill switches – reference this charge and this evidence where possible (e.g. “s18 specific intent”, “CCTV gap on sequence”).
- **Evidence-driven kill switches** where possible (e.g. “If [document X] shows [Y]”).
- **Offence-specific** judge language (e.g. s18/s20: intent, causation, Turnbull) so “what the court decides” reads as for this charge.

**Result:** Clear attack order; strategy reads as “this case.” By this point UI layout and export already work, so engine changes don’t create chaos.

---

## Stage 7 – “What we’re waiting on”

**What:** One place that lists what’s blocking or pending.

**Changes:**
- Single list: outstanding disclosure, key docs, and (if used) client instructions.
- Shown in its own section or panel (e.g. near the plan or top of case).

**Result:** One clear “what we’re waiting on” list. Drives chase-ups and keeps strategy honest about what’s still unknown.

---

## Stage 8 – “Strategy health” / “Still on track?”

**What:** One line or badge that answers “is this plan still valid?”

**Changes:**
- e.g. “Strategy still valid” vs “Reassess – new disclosure / hearing / client instruction” with optional “look here” link.
- Logic can be simple at first (e.g. reassess if disclosure or key date changed since last strategy update). A simple rule beats a clever one here.

**Result:** The question every supervisor actually asks – answered in one glance.

---

## Stage 9 – Optional extras

**What:** Only if you decide you need them.

**Options:**
- **Client/counsel comms log:** e.g. “Strategy summary sent to client 12/01”; “Instructions to counsel 15/01.”
- **Strategy ↔ evidence links:** Where the plan says “challenge intent” or “CCTV gap,” show which documents/evidence that’s tied to.

**Result:** Audit trail and evidence grounding. Can be dropped or delayed without affecting Stages 1–8.

---

## Part 2 – What we’re changing (summary)

| Area | Current | After |
|------|--------|--------|
| Judge wording | “Court must”, fragments, repeated “whether” | “Issue for the court…”, full sentences, one formulation per issue |
| Objectives | “Seek … or seek …” | “Seek … or obtain …” |
| Labels | “Court Intolerances” | “Evidential limitations” |
| Duplication | Same point in several sections; same counter twice | One per distinct issue; one per distinct counter (narrow “same point”) |
| Supervisor Snapshot | Repeats bullets below | Summary only or collapsible |
| Layout | Single long column | At-a-glance strip + two columns (court left, us right) |
| Strategy History | On main view | Off main view (tab/link) |
| Export | None or ad-hoc | Counsel-ready projection of view |
| CaseBrain top summary | Stays | Stays |

---

## Part 3 – What we’re adding (summary)

| Stage | Add |
|-------|-----|
| 5 | Strategy one-liner from engine; Risks & fallbacks block from engine |
| 6 | Attack sequence; case-specific burden/counters; evidence-driven kill switches; offence-specific judge text |
| 7 | “What we’re waiting on” list |
| 8 | “Strategy health” / “Still on track?” |
| 9 | (Optional) Comms log; strategy–evidence links |

---

## Part 4 – Why solicitors benefit

- **Judge:** “What the court has to decide” and “the issue for the court is whether…” surface what the judge will be expecting and thinking (legal tests, constraints, evidential limits).
- **Prosecution:** Prosecution burden and defence counters show what the prosecution will run and how we answer; kill switches include when their case gets stronger.
- **Clarity:** One strategy line, one place for risks, clear attack order, less repetition, counsel-ready export.
- **Governance:** “Still on track?” and “what we’re waiting on” support supervision and file ownership.

The app stays “strategy to win” – this plan makes that strategy clearer, consistent, and easier to use and export.

---

## Part 5 – Implementation note

Execute in order. Do not introduce concerns belonging to a later stage. After Stages 1–4, review before committing to 5–6.
