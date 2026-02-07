# CaseBrain – Nav & Pages Plan (Criminal-first)

**Status:** Planning only. No code until we agree.

**Context:** Some routes throw server errors (/intake, /search). Dashboard is empty. Analytics shows N/A and 0s. OWNER DEBUG bar is visible. You want to focus on criminal, hide other solicitor roles for now, and decide what each area is for and how it should look. The current pages (dashboard, intake, search, etc.) weren’t right – they error or are empty – so we’re redefining how they should look and work from scratch for criminal-only.

**Decisions (locked in for this plan):**

- **Hide other solicitor roles.** Only “Criminal Defence Solicitor” (or one criminal role) in Settings / role selector. No General Litigation, Housing, PI, etc. until you say.
- **Criminal dashboard only.** One “home” that shows recent criminal cases and one clear next action. We decide the layout; no reliance on what’s there now.
- **Dates where they matter.** Last updated on cases (Dashboard + Cases), date uploaded on Intake/Upload, date deleted in Bin – all in the plan below so we build them in.

---

## 1. What’s broken / empty (from your screenshots)

| Route / area      | Current state |
|-------------------|----------------|
| **/intake**       | Server error (or, when it loads: “No unprocessed documents” + OWNER DEBUG). |
| **/search**      | Server error. |
| **Dashboard**    | Empty main content. |
| **Analytics**    | Loads; Active Cases 2, Billable Hours 0H, Critical Risks 0, Avg Settlement N/A; Cases by Practice Area (Criminal 7, etc.); OWNER DEBUG. |
| **Intake (when up)** | “Intake Inbox” – process docs into cases; “No unprocessed documents”; OWNER DEBUG. |
| **Templates / Settings / Bin** | Not shown in descriptions; assume need a pass. |
| **OWNER DEBUG bar** | Shown at bottom (userId, email, isOwner, bypassActive, plan). |

---

## 2. Do we need each of these at all? (Criminal-first)

**Keep and fix / flesh out**

- **Cases** – Core. List cases → open case → criminal strategy plan. Essential.
- **Dashboard** – Worth keeping as “home” but it must show something useful (e.g. recent cases, next steps, or a simple criminal summary). Right now it’s empty, so it feels broken.
- **Upload** – Needed to get documents into the system. Keep.
- **Intake** – Concept is good (process new docs into cases or attach to existing). Need to fix the server error and decide what “good” looks like (see below).

**Fix so they don’t error; then decide depth**

- **Search** – Users expect search. Fix the 500. Then decide: global case/search or only within a case. At minimum: fix error and show a working page (even if simple).

**Optional / hide for now**

- **Analytics** – “Billable Hours”, “Avg Settlement” feel more practice-management than case-brain. For criminal-first you might:
  - **Option A:** Hide Analytics from nav until you have a clear criminal-specific use (e.g. workload, disclosure deadlines).
  - **Option B:** Keep but reshape around criminal (e.g. “Cases by stage”, “Disclosure status”, “Strategy committed” counts). No code until we agree.
- **Templates** – Only needed if you use letter/draft templates. Can hide from nav until you’re ready.
- **Bin** – Nice to have for deleted/archived. Can hide or keep; low priority.
- **Settings** – Keep for user/org/role. You said you’ll hide other solicitor roles and work on criminal – that likely lives in Settings or role selector.

**OWNER DEBUG bar**

- Should not be visible in production or to non-owners. Plan: only show when e.g. `?debug=1` or when user is owner and a “Show debug” preference is on. Gets its own small stage below.

---

## 3. How each should look – thought through (target state)

**Tone:** Professional, calm, criminal-defence. No clutter. Every screen answers “what do I do here?” in one glance. Dark theme is fine; keep contrast so text is readable and primary actions (Open case, Upload, Attach to case) stand out.

---

### 3.1 Dashboard (Criminal only)

- **Role:** Home. “What’s on my desk right now?” Criminal cases only.
- **Layout:**
  - **Top:** One line: “Criminal cases” or “Your workspace” + optional greeting. No big hero.
  - **Main:** One clear block: **“Recent cases”** – table or cards, 5–10 rows. Each row: **case title** (e.g. “R v Daniel Hughes”), **one-line status** (“Strategy: Charge reduction” or “Disclosure: 3 outstanding”), **last updated** (date – e.g. “5 Feb 2026” or “2 days ago”). Row click or “Open” → case page.
  - **Secondary:** One primary button – e.g. **“New upload”** or **“Go to Cases”** – so the next action is obvious.
  - **Empty state:** If no cases yet: “No cases yet. Upload documents or create a case from Intake.” + link to Upload and Intake.
- **Dates:** “Last updated” on every row (case-level updated-at; we use what the backend has or add it).
- **Not:** Blank. Not multiple dashboards or widgets; one focused “recent cases” list is enough for ship.

---

### 3.2 Cases (Criminal only)

- **Role:** List all criminal cases; open one.
- **Layout:**
  - **Top:** Title “Cases”, short line “Your criminal cases”. Optional: filter by “Active” / “Archived” if we have that later.
  - **Main:** **Table or card list.** Columns (or card lines): **Title**, **Client/ref** (if we have it), **Strategy** (e.g. “Charge reduction”), **Disclosure** (e.g. “3 outstanding” or “Up to date”), **Last updated** (date). Click row/card → open case (the page we already built).
  - **Empty state:** “No cases. Use Upload or Intake to add documents and create a case.”
- **Dates:** “Last updated” column on every row (case updated-at). Optional later: “Next disclosure” or “Next deadline” if we have it from disclosure timeline.
- **Look:** Same dark theme as rest of app; table borders or card borders subtle. “Open” or whole-row click, no double-click.

---

### 3.3 Upload

- **Role:** Add documents to the system (then route to case or Intake).
- **Current state:** Upload works fine. We don’t change the core flow in stages A–E. Any improvements below are **optional polish** (e.g. after Stage E) so we don’t risk breaking what works.
- **Layout (target):**
  - **Top:** “Upload” or “New upload”, one line: “Add documents to a case or send to Intake.”
  - **Main:** **Drag-and-drop zone** + “Browse” button; accept PDF (and whatever else you support). After upload: **“Attach to existing case”** (dropdown or search) or **“Create new case”** or **“Send to Intake”** so the user always has a next step.
  - **Below (optional):** List of “Recently uploaded” – columns: **filename**, **uploaded** (date/time), **status** (e.g. “In intake” / “Attached to case X”) with “Attach to case” if not yet assigned.
- **Dates:** Upload timestamp on each file in “Recently uploaded” if we add that list; show date (and time if useful).
- **Look:** Big, clear drop zone; success state (“3 files uploaded – attach to case?”). No 500.

---

### 3.4 Intake

- **Role:** Process new documents into cases or attach to existing.
- **Layout:**
  - **Top:** “Intake inbox”, one line: “Process new documents into cases or attach to existing cases.”
  - **Main (when there are unprocessed docs):** **List of items** – filename, date uploaded, maybe source. Each row: actions **“Create new case”** and **“Attach to case”** (dropdown). Bulk “Attach all to case X” if we want it later.
  - **Main (when empty):** “No unprocessed documents. All documents are attached to cases.” + link to Upload. No error, no blank.
- **Fix first:** Server error so this page always loads. Then refine wording and actions. Look: same list/table style as Cases; calm, task-focused.

---

### 3.5 Search

- **Role:** Find a case (or later, content inside cases).
- **Layout:**
  - **Top:** “Search” – one prominent **search box** (placeholder: “Search cases by name or reference”).
  - **Main:** **Results area.** Minimum: search cases by title/ref; show list (title, snippet or “Criminal case”, link to open). No 500; if no results, “No cases match ‘X’. Try another term or open Cases.”
- **Look:** Simple, fast. Same dark theme. Can add “Search in documents” later as a second tab or scope.

---

### 3.6 Analytics (if we keep it)

- **Role:** Snapshot of criminal workload – “how many cases, what state.”
- **Layout:**
  - **Top:** “Analytics” or “Overview”, one line: “Criminal case summary.”
  - **Main:** **A few cards in a row.** e.g. **Active cases** (number), **With outstanding disclosure** (number), **Strategy committed** (number). Optional: **Cases by strategy** (Fight charge / Charge reduction / Mitigation – counts). No “Billable hours” or “Avg settlement” unless you need them; no N/A – use “—” or “0” or hide the card until we have data.
- **Look:** Clean cards, same palette. No charts until we have a clear ask.

---

### 3.7 Templates (if shown)

- **Role:** Reusable letter/draft templates.
- **Layout:** “Templates” → list of templates (name, type e.g. “CPS letter”, “Disclosure chase”). Row: “Use” opens a draft; “Edit” if we support it. Criminal-focused labels. If hidden from nav, no change.

---

### 3.8 Settings

- **Role:** User, org, role.
- **Layout:**
  - **Top:** “Settings”.
  - **Sections:** **Profile** (email, name if we have it); **Role** – “I’m working as:” **dropdown with only “Criminal Defence Solicitor”** (or one criminal role) for now; **Organisation** if multi-tenant; **Preferences** (e.g. theme, “Show debug bar” for owners only).
- **Look:** Form-style, grouped. Role dropdown is the main thing for “criminal only”; hide other roles until you’re ready.

---

### 3.9 Bin (if shown)

- **Role:** Deleted or archived items; restore if needed.
- **Layout:** “Bin” → list of deleted items. Columns: **Name** (case or item), **Deleted** (date). Action “Restore”. Low priority; can stay minimal.
- **Dates:** “Deleted” date on each row so user knows how old the deletion is.

---

### 3.10 OWNER DEBUG bar

- **Where:** Bottom of viewport, full width.
- **When:** Only when explicitly on – e.g. `?debug=1` in URL or Settings → “Show debug bar” (owners only). Off by default in production; normal users never see it.
- **Look:** Same as now (userId, email, isOwner, bypassActive, plan) but hidden unless enabled.

---

## 4. Suggested stages (order of work)

| Stage | What | Outcome |
|-------|------|--------|
| **A** | Fix server errors on `/intake` and `/search` | Both routes load; no 500. Intake shows inbox (or empty state). Search shows a page (can be minimal). |
| **B** | Dashboard: show something | At least “Recent criminal cases” (or recent cases) with link to case. No empty white/dark area. |
| **C** | Hide other solicitor roles | Role dropdown only shows criminal role(s). No code in other areas for other roles until you say. |
| **D** | Hide or simplify nav items | Hide Analytics (or Templates, Bin) from sidebar if we don’t need them for launch. Keep: Dashboard, Cases, Upload, Intake, Search, Settings. |
| **E** | OWNER DEBUG bar only when debug on | Bar hidden unless e.g. `?debug=1` or owner preference. |
| **F** | (Optional) Intake flow and Search UX | Intake: clear “create case” / “attach to case”. Search: useful results (e.g. by case name). |
| **G** | (Optional) Analytics for criminal | If we keep it: criminal-only metrics, no N/A where avoidable. |

**How we avoid messing anything up:** We do one stage at a time (A then B then C, etc.). We never change the criminal case page or strategy plan. After each stage we check that the changed page works and that opening a case / strategy still works. Upload already works – we don’t change it in A–E; any Upload improvements are optional polish later (see Section 3.3).

---

## 5. What we’re not changing (per your note)

- No change to the **criminal case page** or the **strategy plan** we built (Stages 1–8).
- No new features there until you say.
- Other practice areas (housing, PI, etc.) – hidden or out of scope for this plan.

---

## 6. Desktop version alongside URL (web) version – planning only

**Yes, it’s possible** to have both:

- **URL version:** What you have now – app hosted (e.g. Vercel), users open `https://...` in the browser.
- **Desktop version:** Same app packaged so it runs as a native-style window on Windows / Mac (and optionally Linux).

**Ways to do the desktop version:**

| Option | What it is | Pros | Cons |
|--------|------------|------|------|
| **Electron** | Wraps your web app in a desktop window; can add system tray, local storage, “open file” from disk. | Mature, many examples (VS Code, Slack). Same codebase as web. | Heavier install size; more RAM. |
| **Tauri** | Uses the OS web view; smaller binary, less resource use. | Lighter than Electron; good for a “slim” desktop app. | Slightly different setup; Rust layer. |
| **PWA** | Users “Install” the site from the browser; opens in its own window, can work offline to a degree. | No separate desktop build; one codebase. | Feels “installed” but not a true native app; limited system integration. |

**Practical plan:**

- **Short term:** One codebase (Next.js), one URL. No desktop-specific code yet.
- **When you want desktop:** Add a **packaging** step: e.g. an Electron or Tauri project that **loads your deployed URL** (or a local build). So: same app, same backend and auth; desktop = a shell that opens that URL (or a built bundle). No need to change PLAN_NAV_AND_PAGES or the nav/pages work.
- **Later:** If you need desktop-only features (e.g. “Open file from disk”, system notifications, offline docs), add them in the Electron/Tauri layer; keep the URL version as-is where possible.

So: **yes, you can have both URL and desktop; plan it as “same app, plus a desktop wrapper when we’re ready”; no change to this plan until you decide to add desktop.**

---

## 7. Plan walkthrough – go through before we go

Use this as a quick checklist when we’re ready to start. Nothing here changes the strategy or the case page.

| # | Area | What we’re doing | Result |
|---|------|------------------|--------|
| 1 | **Roles** | Hide all non-criminal solicitor roles | Settings / role: only “Criminal Defence Solicitor”. Rest of app assumes criminal. |
| 2 | **Nav** | Simplify what’s in the sidebar | Show: Dashboard, Cases, Upload, Intake, Search, Settings. Hide (for now): Analytics, Templates, Bin – unless you want one of them. |
| 3 | **Dashboard** | Replace empty page with real content | “Criminal cases” / “Your workspace” + **Recent cases** list (title, status line, last updated) + one primary action (e.g. New upload / Go to Cases). Empty state with link to Upload + Intake. |
| 4 | **Cases** | List all criminal cases | Table/cards: Title, Client/ref, Strategy, Disclosure, Last updated. Click → case page (unchanged). |
| 5 | **Upload** | Keep working flow; no core changes in A–E | Optional polish later: clearer post-upload actions (Attach / Create case / Intake), “Recently uploaded” list with filename + date. |
| 6 | **Intake** | Fix 500 and define layout | Page loads. Table: Filename, Uploaded (date), Type. Actions: Create new case, Attach to case. Empty state when no unprocessed docs. |
| 7 | **Search** | Fix 500 and minimal UX | Page loads. One search box, results list (cases by name/ref). No 500. |
| 8 | **Settings** | Criminal-only role | Profile, **Role = Criminal Defence Solicitor only**, Organisation, Preferences (e.g. Show debug bar for owners). |
| 9 | **OWNER DEBUG** | Hide by default | Shown only when `?debug=1` or owner turns “Show debug bar” on in Settings. |
| 10 | **Dates** | Where they matter | Last updated on Dashboard + Cases; uploaded date on Intake + Upload; deleted date in Bin (if we show Bin). |

**What we’re not touching:** Criminal case page, strategy plan (Stages 1–8), disclosure timeline, strategy health badge – all stay as they are.

**Order of work (stages):** A (fix intake + search) → B (dashboard content) → C (hide other roles) → D (hide/simplify nav) → E (debug bar). Then optional F (intake/search UX), G (analytics criminal-only) if you want them.

---

## 8. Next step

- Go through **Section 7** (walkthrough) and confirm you’re happy with each row – or note what to change.
- Say which stages you want (e.g. A + B + C + D + E for a clean criminal-first ship).
- When you say **“go”**, we do code in that order and can stop after each stage to review.

No code until you say “go” on this plan (or a trimmed version of it).
