# Plan: Next Steps + Migrations You Need to Run

**Right now:** The app runs in a **degraded** way if migrations haven’t been run. We **re-enabled full use of the criminal_cases schema** in code (Matter GET/PATCH use `date_of_arrest`, `alleged_offence`; strategy and offence use `alleged_offence`, `offence_override`). **You must run the migrations below in production before deploying**, or the Matter tab will 500 (column does not exist). After migrations, the app uses the real schema and stops relying on fallback logic.

---

## Part 1: Migrations you need to run (production Supabase)

Run these **in order** in your **production** Supabase project (SQL Editor, or `supabase db push` if you use CLI and link prod).

### 1. Base criminal system (if not already run)

If `criminal_cases` doesn’t exist at all, run first:

- **`0036_criminal_law_system.sql`** – Creates `criminal_cases`, `criminal_charges`, and other criminal tables.

(If you already have criminal cases in the app, this is probably already applied.)

---

### 2. Criminal matter + station columns (required for Matter tab and offence)

Run these in this order. Each uses `ADD COLUMN IF NOT EXISTS`, so safe to run even if some columns already exist.

| Order | Migration file | What it adds |
|-------|----------------|--------------|
| 1 | **`20260209100000_criminal_matter_state_and_station.sql`** | `matter_state`, `time_in_custody_at`, `next_pace_review_at`, `interview_stance`, `station_summary`, `bail_return_date`, `bail_outcome`, `matter_closed_at`, `matter_closed_reason` |
| 2 | **`20260213000000_criminal_grounds_for_arrest.sql`** | `grounds_for_arrest`, **`date_of_arrest`**, **`alleged_offence`** |
| 3 | **`20260214000000_criminal_station_copilot_fields.sql`** | `custody_number`, `police_station_name`, `client_initials`, `client_yob`, `representation_type`, risk flags, `initial_disclosure_received`, `initial_disclosure_notes` |
| 4 | **`20260215000000_offence_override.sql`** | **`offence_override`** |

After these, the Matter API and offence resolution can use the full schema and we can **re-enable** in code:

- Matter: select and update `date_of_arrest`, `alleged_offence`
- Strategy/offence: use `alleged_offence` and `offence_override` from DB

---

### 3. How to run them

**Option A – Supabase Dashboard (production)**  
1. Open your **production** project → **SQL Editor**.  
2. For each migration file above, open the file in your repo, copy its contents, paste into a new query, run.  
3. Do in order: 20260209100000 → 20260213000000 → 20260214000000 → 20260215000000 (and 0036 first if needed).

**Option B – Supabase CLI (if you use it)**  
1. Link to production: `supabase link --project-ref <your-prod-ref>`.  
2. Run pending migrations: `supabase db push`.  
   (Only runs migrations that haven’t been applied yet.)

**Check after:** In Table Editor, open `criminal_cases`. You should see columns: `matter_state`, `alleged_offence`, `date_of_arrest`, `offence_override`, `grounds_for_arrest`, plus the station/copilot columns. If any are missing, run the corresponding migration again.

---

## Part 2: Plan – what to do next (order of work)

### Rule: Stabilise first, no new architecture yet

Do **not** add new strategy architecture (element mapping, explicit route maps, procedural timing, confidence labels) until the **current pipeline is stable and proven end-to-end**. Build Phase 2–5 only after Phase 1 is verified.

---

### Phase 1: Stabilise and verify (current pipeline only)

**1. Schema and migrations**

- Run the required `criminal_cases` migrations (Part 1) in production, in order.  
- Code is already re-enabled: Matter uses `date_of_arrest`, `alleged_offence`; strategy/offence use `alleged_offence`, `offence_override`. **Deploy only after migrations**, or Matter will 500.

**2. Verify the pipeline (no new features)**

- **Document queries:** Same constraints (case_id + org_id) across Case Files, strategy-analysis, and any route that reads documents.  
- **Strategy input text:** Strategy engine receives the actual bundle text (raw + summary) from those documents, not stale or different source.  
- **Offence resolution:** Uses correct sources (charges → alleged_offence → override → bundle inference).  
- **Offence visible in UI:** Resolved offence is a **hard visible input** to strategy, with **source** shown:
  - from charges  
  - from alleged_offence (matter)  
  - from override  
  - from bundle inference  
  - unknown  
  Example: **Resolved offence: GBH s20** · Source: charge sheet · (optional: Confidence: high)  
  Or: **Resolved offence: Unknown** · Action: add charge sheet / override offence  
- **Offence override:** When user overrides offence, strategy inputs (and output) refresh.  
- **Strategy output:** Deterministic (e.g. latest row only, no upsert, no stale cache).

**3. Deploy and confirm**

- Matter tab loads and saves; strategy loads for a case with documents; no 500s.

**Outcome:** Schema matches code; pipeline verified end-to-end; offence and its source are inspectable. **Only after this** do we do Phase 2+.

---

### Phase 2: Honest feedback and no fake strategy

5. **Upload feedback:** Per file in Case Files, show why it’s “thin” if applicable: “Text extracted (X chars)” / “Summary only” / “No text – image-only or failed; re-upload or OCR.”  
6. **When offence is unknown:** Don’t show full offence-specific strategy. Show: “Add charge sheet / key evidence for offence-specific strategy” and optional generic process steps only.  
7. **Optional:** “Paste / add text” for charge sheet or key details when there’s no PDF yet; run offence resolution + strategy from that.

**Outcome:** Users know why strategy is missing or limited; no misleading “full” strategy when we don’t know the offence.

---

### Phase 3: Strategy that “knows” the law (playbooks per offence)

8. **Offence taxonomy:** One canonical list of offence types the app supports (e.g. assault, ABH, GBH s.18/s.20, burglary, robbery, arson, rape, drugs, fraud, etc.).  
9. **Playbook per offence:** For each type, define (in data/config): elements to prove, common defence angles, disclosure that matters, process hooks.  
10. **Wire strategy to playbooks:** Resolved offence → load that playbook → generate strategy from playbook + bundle (and optionally AI).  
11. **Extend offence list** over time (arson, sexual offences, fraud, etc.) so the app can “fight any case” in the same way.

**Outcome:** Strategy is offence-specific and grounded in a structured view of the law, not one generic template.

---

### Phase 4: Solicitor workflow (stage, timeline, disclosure)

12. **Stage:** Derive stage (e.g. at station / post-charge / pre-PTPH / disclosure / trial prep) from matter state + hearings; show it and use it to group next steps.  
13. **One timeline:** Key dates (charge, hearings, disclosure) in one place; next steps tagged “next 48h” / “before PTPH” / “before trial”.  
14. **Disclosure:** “What we have” vs “what we’ve asked for” vs “what’s missing” by offence type; strategy can say “provisional until we have X.”

**Outcome:** App feels like a workflow tool, not just a strategy generator.

---

### Phase 5: Documents and polish

15. **OCR or vision** for image-only PDFs so upload doesn’t always end up “thin”.  
16. **Sources / confidence:** Strategy labels like “Based on full bundle” vs “Based on summaries only” vs “Generic – add evidence”.  
17. **Client instructions / court-facing:** Short, offence + stage aware; optional export for hearings.

---

## Summary

- **Stabilise first:** No element mapping, route maps, procedure, or confidence labels until Phase 1 is verified.  
- **Migrations to run (in order):**  
  1. `0036_criminal_law_system.sql` (if criminal_cases doesn’t exist)  
  2. `20260209100000_criminal_matter_state_and_station.sql`  
  3. `20260213000000_criminal_grounds_for_arrest.sql`  
  4. `20260214000000_criminal_station_copilot_fields.sql`  
  5. `20260215000000_offence_override.sql`  
- **Code:** Matter/offence schema use is already re-enabled; deploy only after migrations.  
- **Phase 1:** Run migrations → verify pipeline (doc queries, strategy input text, offence + **source** in UI, override refresh, deterministic strategy) → then Phase 2–5 in order.
