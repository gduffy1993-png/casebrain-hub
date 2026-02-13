# Implementation summary – AI strategy, tabs, police station, bail, hearings (steps 1–16)

Use this document to bring another AI (e.g. ChatGPT) or a developer up to speed on what was built. It lists every file that was created or changed and what was done in each.

---

## 1. New files created

### `supabase/migrations/20260209100000_criminal_matter_state_and_station.sql`
- **Purpose:** Adds new columns to `criminal_cases` for matter lifecycle, police station, and bail.
- **Columns added (all `ADD COLUMN IF NOT EXISTS`):**
  - `matter_state` (TEXT) – e.g. at_station, bailed, rui, charged, before_first_hearing, before_ptph, before_trial, trial, sentencing, disposed
  - `time_in_custody_at` (TIMESTAMPTZ)
  - `next_pace_review_at` (TIMESTAMPTZ)
  - `interview_stance` (TEXT) – e.g. no_comment, prepared_statement, answered
  - `station_summary` (TEXT)
  - `bail_return_date` (DATE)
  - `bail_outcome` (TEXT) – e.g. extended_bail, rui, nfa, charged
  - `matter_closed_at` (TIMESTAMPTZ)
  - `matter_closed_reason` (TEXT)
- **Note:** `plea` and `plea_date` already exist on `criminal_cases` from an earlier migration; no change to those.

### `app/api/criminal/[caseId]/matter/route.ts`
- **Purpose:** Single API for matter state, police station, bail outcome, and matter closed.
- **GET:** Returns JSON: `matterState`, `station` (timeInCustodyAt, nextPaceReviewAt, interviewStance, stationSummary), `bailReturnDate`, `bailOutcome`, `matterClosedAt`, `matterClosedReason`, `plea`, `pleaDate`. Reads from `criminal_cases` (all columns above plus plea/plea_date).
- **PATCH:** Accepts body with any of: `matterState`, `station` (nested), `bailReturnDate`, `bailOutcome`, `matterClosedAt`, `matterClosedReason`, `plea`, `pleaDate`. Validates `matterState` against a fixed list. Updates `criminal_cases` and returns `{ ok: true }`.

### `components/ui/tabs.tsx`
- **Purpose:** Reusable tab bar + content panel for the criminal case page.
- **Exports:** `CaseTabs` component, `TabItem` type.
- **Props:** `activeTab` (string), `tabs` (array of `{ id, label }`), `onTabChange(id)`, `children` (content for active tab), optional `className`.
- **Behaviour:** Renders a horizontal tab list (buttons with aria roles). Active tab has distinct styling. Content area shows `children` (parent decides what to render per tab). No internal state; fully controlled by parent (e.g. URL `?tab=`).

### `components/criminal/PoliceStationTab.tsx`
- **Purpose:** Full “Police station” tab content.
- **Data:** Fetches `GET /api/criminal/[caseId]/matter` on mount; holds local state for matter stage, station (time in custody, next PACE review, interview stance, station summary), bail return date/outcome, matter closed (date, reason). “Save” sends PATCH to same matter API with all of these.
- **UI sections:**
  - **Matter stage** – Dropdown to set matter state (drives default tab when opening case).
  - **Station pack** – “Upload station documents” button; calls `onAddEvidenceUpload` (opens existing add-evidence flow).
  - **Custody clock** – Two datetime-local inputs: time in custody, next PACE review.
  - **Interview stance** – Select: Not recorded / No comment / Prepared statement / Answered questions.
  - **Speak or no comment** – Guardrailed card (not legal advice; bullet list; “you control the decision”).
  - **Station summary** – Textarea for free-text summary.
  - **Bail return / outcome** – Date input + outcome dropdown (Extended bail, RUI, NFA, Charged). On Charged sets matter state to charged; on RUI sets rui; on NFA sets disposed.
  - **Matter closed** – Date + reason (e.g. NFA, acquitted, sentenced).
  - **Request paperwork** – Static list (custody record, MG4, MG5, charge sheet, disclosure list, interview record).
- **Props:** `caseId`, optional `onAddEvidenceUpload`.

### `components/criminal/PleaRecordCard.tsx` (if created in this work)
- **Purpose:** Record plea and plea date for the case (used in Hearings tab).
- **Data:** GET/PATCH `/api/criminal/[caseId]/matter` for `plea` and `pleaDate`. Matter API reads/writes `criminal_cases.plea` and `criminal_cases.plea_date`.
- **UI:** Dropdown (no plea / no plea yet / not guilty / guilty), date input, Save button when dirty.
- **Props:** `caseId`.

### `components/criminal/FirstDisclosureRequestCard.tsx` (if created in this work)
- **Purpose:** One-click “Request initial disclosure” draft (step 12).
- **Data:** POST `/api/criminal/[caseId]/letters/draft` with body `{ kind: "initial_disclosure_request" }`. Expects response `{ subject, body }` (from `lib/criminal/deterministic-letter-drafts.ts`).
- **UI:** “Generate draft” button; then shows subject + body and “Copy to clipboard” / “New draft”.
- **Props:** `caseId`.

---

## 2. Files modified (and what changed)

### `components/criminal/CriminalCaseView.tsx`
- **Imports added:** `CaseTabs`, `TabItem` from `@/components/ui/tabs`; `DisclosureTrackerTable`, `DisclosureChasersPanel`, `ClientInstructionsRecorder`, `PoliceStationTab`, `PleaRecordCard`, `FirstDisclosureRequestCard`.
- **Constants added:** `CRIMINAL_CASE_TAB_IDS` (array of tab id strings), `CRIMINAL_CASE_TABS` (array of `{ id, label }` in order: Summary, Charges, Strategy, Disclosure, Next steps, Hearings, Client & instructions, Sentencing, Key facts, Safety & procedural, Additional tools, Police station), `DEFAULT_TAB = "summary"`.
- **State added:** `matterState` (for default tab), `matterClosed` (for post-disposal banner: `{ at, reason }`).
- **Effects:** One `useEffect` fetches `GET /api/criminal/[caseId]/matter` and sets `matterState` and `matterClosed` (from `matterClosedAt` / `matterClosedReason`).
- **Tab logic:** `activeTab` comes from URL `searchParams.get("tab")` if valid, else default: if `matterState === "at_station"` then `"police-station"`, else if state is charged/before_first_hearing/before_ptph/before_trial/trial then `"strategy"`, else `"summary"`. `setTab(tabId)` does `router.replace("?tab=" + tabId)`.
- **Layout:** Below the “trust line” and optional “Matter closed” banner, the main content is wrapped in `<CaseTabs activeTab={activeTab} tabs={CRIMINAL_CASE_TABS} onTabChange={setTab}>`. Each tab id is handled with `activeTab === "..." && (...)` rendering the right content.
- **Tab content:** key-facts → CaseKeyFactsPanel; summary → CaseSummaryPanel; charges → ChargesPanel; strategy → Phase selector, gate banner, two-column (Evidence + Strategy), Bail section, Sentencing tools (phase 3); disclosure → FirstDisclosureRequestCard, DisclosureTrackerTable, DisclosureChasersPanel (or placeholder when no snapshot); next-steps → Phase2StrategyPlanPanel; hearings → CourtHearingsPanel, PleaRecordCard, FoldSection “Trial date alerts”, FoldSection “Trial prep checklist”; sentencing → intro card, SentencingMitigationPanel (phase 3), FoldSection “Sentencing checklist”; client-instructions → ClientInstructionsRecorder; safety-procedural → placeholder; additional-tools → PACE, CourtHearingsPanel, ClientAdvicePanel; police-station → PoliceStationTab with `onAddEvidenceUpload`.
- **Matter closed banner:** Renders when `matterClosed` is set; shows “Matter closed (date) – reason. You can archive from Actions on the case page.”

### `components/criminal/CaseEvidenceColumn.tsx`
- **Removed:** Imports for `DisclosureTrackerTable`, `DisclosureChasersPanel`, `ClientInstructionsRecorder`.
- **Removed:** The entire “Client instructions” block (ClientInstructionsRecorder).
- **Removed:** The entire “Disclosure” block (DisclosureTrackerTable + DisclosureChasersPanel).
- **Left:** Current defence position, Strategy commitment panel, Solicitor notes, Missing evidence. A short comment notes that Client instructions and Disclosure now live in their own tabs.

### `app/api/criminal/[caseId]/bail/route.ts`
- **GET:** `select()` extended to include `bail_return_date`, `bail_outcome`. Response object now also returns `bailReturnDate` and `bailOutcome` (or null). Cast used for TypeScript where DB types are not generated.
- **PATCH added:** New handler. Accepts body: `bailReturnDate`, `bailOutcome`, `bailConditions`. Validates `bailOutcome` against list (extended_bail, rui, nfa, charged). Updates `criminal_cases` and returns `{ ok: true }`.

### `components/criminal/BailTracker.tsx`
- **Types:** `BailData` extended with `bailReturnDate: string | null` and `bailOutcome: string | null`.
- **UI:** New “Return / outcome” section when either is present: shows return date and outcome text; if outcome is “charged”, shows line “Go to Strategy tab to run the case.”
- **UI:** When there are bail conditions, a “Copy conditions for client” button copies a numbered list of conditions to the clipboard.

### `docs/PLAN_AI_STRATEGY_HERO_AND_CONVERSATION.md`
- **Added:** “Implementation order (single list)” table (steps 1–16 with short descriptions).
- **Added:** “Progress: Steps 1–16 done” and “Steps 11–16 (what’s in place)” – bullet summary of Hearings tab, First disclosure request, Sentencing tab, Post-disposal banner, Tab order/expandables, Method encoding.
- **Added:** “Your checklist (when implementation is finished)” – run migration 20260209100000, no new env vars, deploy/run, optional backfill note, note that steps 11–16 need no extra migration.
- **Updated:** Previous “6 steps left” and “After steps 11–16 (future)” replaced with the above completion summary.

---

## 3. Existing files used (no edits in this implementation)

- **Hearings:** `app/api/criminal/[caseId]/hearings/route.ts` (GET/POST/PATCH), `components/criminal/CourtHearingsPanel.tsx` (type, date, outcome, whatsNeededNext; trial date callout; HearingCard with outcome/notes/whatsNeededNext).
- **Letters draft:** `app/api/criminal/[caseId]/letters/draft/route.ts` – already supports `kind: "initial_disclosure_request"`; uses `lib/criminal/deterministic-letter-drafts.ts` (`buildCriminalLetterDraft`).
- **Strategy suggest:** `lib/criminal/strategy-suggest/prompt.ts` uses `METHOD_HINTS_BY_OFFENCE` and offence list from constants; `lib/criminal/strategy-suggest/constants.ts` has `METHOD_HINTS_BY_OFFENCE`, `getStrategyAnglesForOffence`, offence types and strategy angle IDs/labels.

---

## 4. Database

- **One migration to run:** `20260209100000_criminal_matter_state_and_station.sql`. Adds the columns listed in section 1 to `criminal_cases`. No new tables. `plea` / `plea_date` already exist from earlier criminal schema.
- **Tables used:** `criminal_cases` (matter, station, bail, closed, plea), `criminal_hearings` (unchanged), rest of schema unchanged for this feature set.

---

## 5. User-facing behaviour summary

- **Criminal case page** is tabbed; tab is reflected in URL `?tab=summary` (or charges, strategy, disclosure, etc.). Default tab depends on matter state (at station → Police station; charged/pre-trial → Strategy; else Summary).
- **Police station tab:** Set matter stage, upload docs, custody clock, interview stance, station summary, speak/no comment notice, bail return date & outcome, matter closed, request paperwork list. All persisted via matter API.
- **Bail:** Return date and outcome stored and shown in BailTracker; “Copy conditions for client” for bail conditions.
- **Matter closed:** When set (e.g. in Police station tab), a banner appears at top of case view; no extra migration for steps 11–16.
- **Hearings tab:** Court hearings (add/edit), plea record, trial date reminder text, trial prep checklist (expandable).
- **Disclosure tab:** First disclosure request card (draft + copy), then disclosure tracker and chasers.
- **Sentencing tab:** Phase 3 mitigation panel + sentencing checklist (expandable).
- **Strategy / Evidence:** Disclosure and Client instructions removed from Evidence column; they live only under Disclosure and Client & instructions tabs.

---

## 6. Quick file list for “what changed”

| File | Action |
|------|--------|
| `supabase/migrations/20260209100000_criminal_matter_state_and_station.sql` | Created |
| `app/api/criminal/[caseId]/matter/route.ts` | Created |
| `components/ui/tabs.tsx` | Created |
| `components/criminal/PoliceStationTab.tsx` | Created |
| `components/criminal/PleaRecordCard.tsx` | Created (if part of this work) |
| `components/criminal/FirstDisclosureRequestCard.tsx` | Created (if part of this work) |
| `components/criminal/CriminalCaseView.tsx` | Modified (tabs, matter state, default tab, all tab content, matter closed banner) |
| `components/criminal/CaseEvidenceColumn.tsx` | Modified (removed Disclosure and Client instructions blocks) |
| `app/api/criminal/[caseId]/bail/route.ts` | Modified (GET extended; PATCH added) |
| `components/criminal/BailTracker.tsx` | Modified (return date/outcome display; copy conditions) |
| `docs/PLAN_AI_STRATEGY_HERO_AND_CONVERSATION.md` | Modified (implementation order, progress, checklist) |
| `docs/IMPLEMENTATION_SUMMARY_FOR_CONTEXT.md` | Created (this file) |

---

## Steps 11–16 (Hearings, Disclosure template, Sentencing, Post-disposal, Polish, Method encoding)

- **11 Hearings:** Hearings tab in `CriminalCaseView` renders `CourtHearingsPanel` (add/edit hearings: type, date, outcome, what’s needed next; trial date callout when type is Trial), `PleaRecordCard` (plea + date from matter API), FoldSection “Trial date alerts” (4w / 2w / 1w / day before), FoldSection “Trial prep checklist”. No new files; uses existing `CourtHearingsPanel`, `PleaRecordCard`, matter API (plea/plea_date).
- **12 First disclosure request:** `FirstDisclosureRequestCard` in Disclosure tab; POST `/api/criminal/[caseId]/letters/draft` with `kind: "initial_disclosure_request"`; copy to clipboard. File: `components/criminal/FirstDisclosureRequestCard.tsx`.
- **13 Sentencing:** Sentencing tab has intro card, `SentencingMitigationPanel` (phase 3), FoldSection “Sentencing checklist”. Trial prep checklist in Hearings tab.
- **14 Post-disposal:** Matter closed banner when `matterClosedAt` from matter API; `matterClosed` state and banner in `CriminalCaseView`; Police station tab has Matter closed (date + reason). No new files.
- **15 Trim and polish:** Tab order in `CRIMINAL_CASE_TABS`; long blocks use `FoldSection` (expandable). No new files.
- **16 Method encoding:** `lib/criminal/strategy-suggest/prompt.ts` uses `METHOD_HINTS_BY_OFFENCE` and builds per-offence method block; `lib/criminal/strategy-suggest/constants.ts` has `METHOD_HINTS_BY_OFFENCE`, `getStrategyAnglesForOffence`. No new files.

---

## 7. Everything we’ve done in detail (narrative)

This section explains the full implementation in order: what we built, why, and how it fits together.

### Product context

CaseBrain is a **criminal defence solicitor app** (England & Wales). The solicitor owns the strategy; the app supports with evidence-linked tools and guardrailed AI. We implemented a **tabbed criminal case page**, **matter lifecycle**, **police station workflow**, **bail**, **hearings**, **disclosure**, **sentencing**, and **post-disposal**, so one case page can carry the journey from station to trial/sentence.

---

### Step 1: Tabbed shell

**What:** The criminal case page is no longer one long scroll. It has a **tab bar** and one visible tab at a time.

**How:** We added a reusable `CaseTabs` component (`components/ui/tabs.tsx`) that takes the active tab id, a list of tabs (id + label), and an `onTabChange` callback. The parent (CriminalCaseView) reads the active tab from the URL (`?tab=summary`, `?tab=strategy`, etc.). If the user clicks a tab, we update the URL with `router.replace`, so the tab is shareable and bookmarkable. The **default tab** when there is no `?tab=` was initially “Summary”; later we made it depend on matter state (step 2).

**Tabs (in order):** Summary, Charges, Strategy, Disclosure, Next steps, Hearings, Client & instructions, Sentencing, Key facts, Safety & procedural, Additional tools, Police station. Each tab’s content is rendered only when that tab is active (`activeTab === "hearings"` etc.), so we don’t mount everything at once.

**Files:** New `components/ui/tabs.tsx`. Modified `CriminalCaseView.tsx`: tab constants, URL-driven `activeTab`, `setTab`, and wrapping the main content in `<CaseTabs>` with one block per tab.

---

### Step 2: Matter state / lifecycle

**What:** Every criminal case has a **matter state** (e.g. at station, bailed, RUI, charged, before first hearing, trial, sentencing, disposed). This drives which tab opens by default and (in future) which actions are relevant.

**How:** We added a `matter_state` column to `criminal_cases` and a single **matter API** (`GET` and `PATCH` `/api/criminal/[caseId]/matter`) that reads and writes matter state plus all the new police-station and bail-related fields (see below). On load, CriminalCaseView fetches matter and sets `matterState`. When computing the default tab (when URL has no `?tab=`): if `matterState === "at_station"` we default to **Police station**; if it’s charged / before first hearing / before PTPH / before trial / trial we default to **Strategy**; otherwise we default to **Summary**. So when a case is “at station” the user lands on the station tab; when it’s “charged” they land on strategy.

**Files:** New migration `20260209100000_criminal_matter_state_and_station.sql` (adds `matter_state` and other columns). New `app/api/criminal/[caseId]/matter/route.ts`. Modified `CriminalCaseView.tsx`: state `matterState`, effect to fetch matter, and default-tab logic using `matterState`.

---

### Step 3: Map content into tabs and remove duplicates

**What:** All existing case content was assigned to the right tab. **Disclosure** and **Client instructions** were removed from the main Evidence column so they only appear in their own tabs (no duplicate blocks).

**How:** In CriminalCaseView we already had (or added) one content block per tab: Key facts, Summary, Charges, Strategy (phase selector, gate banner, two-column Evidence + Strategy, Bail, Sentencing tools), Disclosure, Next steps, Hearings, Sentencing, Client & instructions, Safety (placeholder), Additional tools, Police station. In **CaseEvidenceColumn** we deleted the sections that rendered DisclosureTrackerTable, DisclosureChasersPanel, and ClientInstructionsRecorder. Those now live only under the Disclosure and Client & instructions tabs.

**Files:** Modified `CaseEvidenceColumn.tsx`: removed those three components and their imports; left solicitor notes, missing evidence, defence position, strategy commitment.

---

### Steps 4–8: Police station tab

**What:** A full **Police station** tab for the pre-charge / at-station phase: matter stage, upload station pack, custody clock, interview stance, station summary, a guardrailed “Speak or no comment?” notice, bail return date and outcome, matter closed, and a “Request paperwork” list.

**How:** We added a migration for police-station and bail-related columns on `criminal_cases`: `time_in_custody_at`, `next_pace_review_at`, `interview_stance`, `station_summary`, `bail_return_date`, `bail_outcome`, `matter_closed_at`, `matter_closed_reason`. The **matter API** GET returns these (and plea/plea_date); PATCH accepts them. We built **PoliceStationTab** (`components/criminal/PoliceStationTab.tsx`), which on mount fetches the matter API and keeps local state for all these fields. The UI has: (1) **Matter stage** dropdown – saves to matter state and drives default tab. (2) **Station pack** – “Upload station documents” calls `onAddEvidenceUpload` (existing add-evidence flow). (3) **Custody clock** – two datetime inputs (time in custody, next PACE review). (4) **Interview stance** – select (no comment / prepared statement / answered). (5) **Speak or no comment** – a static, guardrailed card (not legal advice; bullet points; “you control the decision”). (6) **Station summary** – textarea. (7) **Bail return / outcome** – date and outcome dropdown (Extended bail, RUI, NFA, Charged); when user picks Charged we set matter state to charged, RUI → rui, NFA → disposed. (8) **Matter closed** – date and reason. (9) **Request paperwork** – static list (custody record, MG4, MG5, charge sheet, disclosure list, interview record). A single “Save” sends a PATCH with all dirty fields to the matter API.

**Files:** Migration (see step 2), matter API (see step 2), new `PoliceStationTab.tsx`, CriminalCaseView police-station tab content rendering `<PoliceStationTab caseId={caseId} onAddEvidenceUpload={...} />`.

---

### Steps 9–10: Bail (date, outcome, conditions)

**What:** **Bail return date** and **outcome at return** (extended bail, RUI, NFA, charged) are stored and shown. When outcome is “charged” the user is pointed to the Strategy tab. Full **bail conditions** are displayed and there is a “Copy conditions for client” action.

**How:** The migration added `bail_return_date` and `bail_outcome` on `criminal_cases`. The **matter API** reads and writes them (and Police station tab has the bail return/outcome form). We also extended the **bail API** (`GET /api/criminal/[caseId]/bail`) to return `bailReturnDate` and `bailOutcome`, and added **PATCH** to the same route to update return date, outcome, and `bail_conditions`. **BailTracker** was updated to show a “Return / outcome” section when those are set (and “Go to Strategy tab” when outcome is charged) and a “Copy conditions for client” button that copies a numbered list of conditions to the clipboard.

**Files:** Modified `app/api/criminal/[caseId]/bail/route.ts` (GET extended, PATCH added), `BailTracker.tsx` (new fields in type, new UI blocks). Matter API and PoliceStationTab (bail return/outcome) already covered above.

---

### Step 11: Hearings first-class

**What:** **Hearings** are a first-class tab: add/edit court hearings (type, date, outcome, “what’s needed for next hearing”), **plea record** (plea + date), **trial date alerts** (e.g. 4 weeks, 2 weeks, 1 week, day before), and a **trial prep checklist** (witnesses, exhibits, key points, etc.).

**How:** The **Hearings** tab in CriminalCaseView renders: (1) **CourtHearingsPanel** – existing component that fetches hearings from `GET /api/criminal/[caseId]/hearings`, lets the user add a hearing (type, date, court name) and for past hearings edit outcome, notes, and “what’s needed for next hearing”. When there is an upcoming hearing of type “Trial”, it shows a trial date callout with the reminder text (4w, 2w, 1w, day before). (2) **PleaRecordCard** – loads plea and plea date from the matter API, lets the user set plea (no plea / not guilty / guilty) and date, and PATCHes back to the matter API (which writes `criminal_cases.plea` and `plea_date`). (3) **Trial date alerts** – FoldSection with short text reminding to diarise. (4) **Trial prep checklist** – FoldSection with a bullet list (witness list, exhibits, key points, defence statement, legal aid). No new migration: plea/plea_date already existed on `criminal_cases`; hearings use existing `criminal_hearings` table and API.

**Files:** `CriminalCaseView.tsx` (hearings tab content). Existing: `CourtHearingsPanel.tsx`, `PleaRecordCard.tsx`, hearings route, matter API (plea/plea_date).

---

### Step 12: First disclosure request

**What:** In the **Disclosure** tab, a one-click **“Request initial disclosure”** draft (letter/email) so the solicitor can quickly start the disclosure chase.

**How:** **FirstDisclosureRequestCard** calls `POST /api/criminal/[caseId]/letters/draft` with body `{ kind: "initial_disclosure_request" }`. That API uses `lib/criminal/deterministic-letter-drafts.ts` to build a subject and body for an initial disclosure request (CPIA). The card shows the draft and a “Copy to clipboard” button (and “New draft” to regenerate). It appears at the top of the Disclosure tab (with or without snapshot), so disclosure tracker and chasers sit below it.

**Files:** `FirstDisclosureRequestCard.tsx`, CriminalCaseView disclosure tab (first child is FirstDisclosureRequestCard). Existing: letters draft route and deterministic-letter-drafts (already supported `initial_disclosure_request`).

---

### Step 13: Sentencing view and trial checklist

**What:** When the case is in a sentencing phase (or guilty plea), a clear **Sentencing** view: mitigation panel and a **sentencing checklist**. The **trial prep checklist** lives in the Hearings tab (see step 11).

**How:** The **Sentencing** tab in CriminalCaseView shows: an intro card (phase = sentencing / guilty plea, point to Strategy for outcome management), **SentencingMitigationPanel** when phase ≥ 3 (existing component), and an expandable **Sentencing checklist** FoldSection (mitigation bundle, PSR, guidelines, client instructions, legal aid). The trial prep checklist is the FoldSection in the Hearings tab (witnesses, exhibits, key points, defence statement, legal aid).

**Files:** CriminalCaseView sentencing tab content. Existing: SentencingMitigationPanel, FoldSection.

---

### Step 14: Post-disposal / matter closed

**What:** When a matter is **closed** (NFA, disposed, acquitted, sentenced), we record that and show a **“Matter closed”** banner so the case doesn’t stay “live” forever.

**How:** The migration added `matter_closed_at` and `matter_closed_reason` on `criminal_cases`. The matter API GET returns them; PATCH accepts them. **Police station tab** has a “Matter closed” section (date + reason). CriminalCaseView fetches matter on load and, if `matterClosedAt` is set, stores `matterClosed` and renders a banner above the tabs: “Matter closed (date) – reason. You can archive from Actions on the case page.” No separate “archive” API in this implementation; the banner directs the user to existing case actions.

**Files:** Migration, matter API (already include closed fields), PoliceStationTab (Matter closed section), CriminalCaseView (matter fetch and banner).

---

### Step 15: Trim and polish

**What:** **Tab order** is primary (Summary, Charges, Strategy, Disclosure, Next steps, Hearings, Client, Sentencing) then secondary (Key facts, Safety, Additional tools, Police station). **Long reference blocks** (e.g. trial checklist, sentencing checklist) are **expandable** so the page stays scannable.

**How:** Tab order is fixed in the `CRIMINAL_CASE_TABS` array in CriminalCaseView. Long lists and checklists are wrapped in **FoldSection** with `defaultOpen={false}` so they appear as “Show more” / expandable sections rather than one long page.

**Files:** CriminalCaseView (tab order); existing FoldSection usage for trial prep, trial date alerts, sentencing checklist.

---

### Step 16: Method encoding (strategy suggest)

**What:** The **strategy suggestion** AI uses **per-charge method hints** so suggested angles are charge-aware (e.g. assault vs theft vs drugs). Not legal advice; solicitor verifies.

**How:** In `lib/criminal/strategy-suggest/constants.ts` we have **METHOD_HINTS_BY_OFFENCE**: for each offence type (assault_oapa, robbery, theft, burglary, drugs, fraud, sexual, criminal_damage_arson, public_order, other) a short line of “Consider: …” (elements, typical angles). We also have **getStrategyAnglesForOffence** (generic angles plus offence-specific ones). The **prompt** in `lib/criminal/strategy-suggest/prompt.ts` builds a “Per-offence method” block from METHOD_HINTS_BY_OFFENCE and injects it into the system prompt, and uses the allowed strategy angle IDs from constants. The model is told to prefer angles that match the offence type. No new API or UI; this is prompt/constants only.

**Files:** `lib/criminal/strategy-suggest/prompt.ts` (imports constants, builds METHOD_BLOCK, uses in system prompt), `lib/criminal/strategy-suggest/constants.ts` (METHOD_HINTS_BY_OFFENCE, getStrategyAnglesForOffence, offence types, angle IDs/labels).

---

### Summary of data flow

- **Matter state, station, bail outcome, closed, plea:** Stored on `criminal_cases`. Read/written via **matter API** (GET/PATCH). Used by: default tab, Police station tab, matter closed banner, PleaRecordCard, BailTracker (bail return/outcome also in bail API).
- **Bail conditions, next_bail_review, bail_status, remand:** Already on `criminal_cases`. **Bail API** GET returns them plus bail return date/outcome; PATCH updates return date, outcome, conditions. Used by BailTracker.
- **Hearings:** Stored in `criminal_hearings`. **Hearings API** GET/POST/PATCH. Used by CourtHearingsPanel.
- **First disclosure draft:** No new storage. Letters draft API builds the text from case/charges/disclosure data and returns subject + body. FirstDisclosureRequestCard just displays and copies.

---

You can paste this document (or sections of it) into ChatGPT or another tool to give full context on what was built and which files were touched.
