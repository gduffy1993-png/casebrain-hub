# CaseBrain – Next steps plan (no code yet)

**Purpose:** Single plan for what to do next. You can add or change items before we implement.

**Done already (no code needed from this plan):** Desktop app (Electron wrapper) is in place – `npm run desktop`, `electron/main.js`, scripts in `package.json`. You still need to do API keys, Stripe, trial emails, etc. as below.

**Trial and desktop:** The trial (2 weeks, 2 cases, 10 docs) and paywall are enforced by your **backend/API**. The desktop app is just a window that loads the same web app (your URL). So when someone uses the desktop app they sign in and hit the same APIs – upload, create case, analysis all check trial and return 402 when limits are hit. There is no separate “desktop” build of the app that bypasses the trial; they have to pay (upgrade) once the trial is over or limits are reached, whether they use the website or the desktop app.

---

## 0. Desktop download link (plan)

**Current state:** You can run the desktop app locally (`npm run desktop` or `npm run electron`). There is **no downloadable installer** yet – so users can’t “download the desktop app” from a link.

**To let users download the desktop app:** You’d add a build step that packages the Electron app into installers (e.g. Windows `.exe`, Mac `.dmg`/`.app`) using something like **electron-builder**. Then you host those files (e.g. on your site, or GitHub Releases, or a CDN) and put a “Download for Windows” / “Download for Mac” link on your site or in the app. That’s a separate piece of work from the current “run locally” setup. No code yet; add to the plan when you want to offer a download link.

---

## 1. High value (do when ready)

| # | Item | What it is | Why |
|---|------|------------|-----|
| **1** | **Trial status in the UI** | Show trial state somewhere visible (e.g. Settings or a small banner): “Trial: X days left · 2/2 cases · 10/10 docs” + **Upgrade** button. | Users see limits before hitting 402; clearer path to upgrade. |
| **2** | **Payment (Stripe)** | Add Stripe: account, env vars, API to create Checkout (or Portal) session, webhook that sets `organisations.plan = 'pro'` when they pay (and back to `free` when they cancel). Wire Upgrade page “Subscribe” to that flow. | So people can actually pay; trial converts to paid. |
| **3** | **402 copy** | Use the same human, solicitor-style message everywhere a limit is hit (upload, intake create-case, analysis rerun/rebuild). E.g. “Trial limit reached: 10 documents. Upgrade to continue.” | Professional, clear; less “generic error” feeling. |

---

## 2. Useful next (after or alongside 1–3)

| # | Item | What it is |
|---|------|------------|
| **4** | **Abuse test** | On a non-owner account (or with paywall on): create 2 cases, 10 docs, then try 3rd case, 11th doc, and expired trial. Confirm all return 402 and no route bypasses trial. |
| **5** | **Dashboard “Disclosure: X outstanding”** | When the API returns disclosure counts per case, wire that into the dashboard case row (UI already prepared). |
| **6** | **Billing / subscription in Settings** | After Stripe: link or section “Manage subscription” (e.g. Stripe Customer Portal) so users can update card, cancel, see invoices. |

---

## 3. Trial emails (plan)

| Item | What it is |
|------|-------------|
| **Email when trial is over** | When the 14-day trial ends, send one email: e.g. "Your CaseBrain trial has ended. Upgrade to keep full access." with link to Upgrade. Needs email sending (Resend, SendGrid, or Supabase). |
| **Email before trial ends (optional)** | E.g. 3 days before: "Your trial ends in 3 days. Upgrade to continue." Same – needs email sending. |

No code yet.

---

## 4. Trial limits – how many cases on the 2-week trial? (plan)

**Current:** 2 cases, 10 documents during the 14-day trial (`lib/paywall/trialLimits.ts`).

| Option | Cases | Docs | Use when |
|--------|--------|------|----------|
| **Strict** | 1 | 5 | Minimise abuse; one case to try. |
| **Current** | 2 | 10 | Balance: enough to see value, not free practice. |
| **Generous** | 3 | 15 | Trials really feel the product; more freeload risk. |

**Recommendation:** Keep **2 cases, 10 docs**. In 2 weeks they can run 2 matters end-to-end; enough to convert. One feels limited; three is a lot. Change anytime via `TRIAL_MAX_CASES` and `TRIAL_MAX_DOCS` in `trialLimits.ts`.

**How it works:** Trial starts on first case or first document (whichever is earlier). For 14 days they can create up to 2 cases and 10 docs total. After that, new case or 11th doc returns 402 until upgrade. Existing cases stay viewable.

---

## 5. Optional / later

| Item |
|------|
| Plan items 4–8 from earlier (recently uploaded list, intake bulk, analytics, search in docs, templates/bin) – only if you need them. |
| Duplicate “Current Defence Position” in Evidence column – remove only if you decide you don’t want it. |

---

## 6. Order of work (suggested)

1. **Trial status UI** (1) – quick win, no payment dependency.  
2. **402 copy** (3) – small, consistent messaging.  
3. **Stripe payment** (2) – follow `docs/PAYMENT_SETUP.md`; then trial can convert.  
4. **Abuse test** (4) – confirm no gaps.  
5. **Dashboard disclosure** (5) – when API supports it.  
6. **Billing in Settings** (6) – after Stripe is live.

You can swap 1 and 3 if you want payment first.

---

## 7. Case page UX – everything in its own box (plan only)

**What you’re after**

- **Every distinct “square” in its own box**  
  On the case page you have lots of separate bits: Key Facts, ACCUSED, PROSECUTOR, CLIENT FOCAL, CAUSE OF ACTION, Incident / Accused Summary, Police / Procedural Summary, Disclosure & Evidential Integrity, What Client Wants, Criminal Defence Links (and each link row), Defence Strategy Plan, Prosecution, Court, Defence, etc. Right now some are in clear boxes, some are not. You want **every one of these** to be in **its own visible box** – so each “square” or block that pops out is clearly contained in a box. Same pattern everywhere: each thing = one box.

- **Collapsible where it makes sense**  
  Where a section has a lot of content (e.g. Incident / Accused Summary), the box can be click-to-expand/collapse (drop down). So: each thing is in its own box, and the big sections are collapsible boxes.

- **Jump to / scroll back**  
  When you use Jump to (e.g. Strategy) you land down the page and have to scroll back up to pick something else. Fix: either a “Back to top” arrow to return to the Jump to bar, or make the main sections (Safety, Strategy, Next steps, Disclosure, Bail) box headers that stay visible so you can click another without scrolling.

**Plan (no code yet)**

| Idea | Description |
|------|-------------|
| **Everything in its own box** | Every distinct block on the page – Key Facts, ACCUSED, PROSECUTOR, each summary section, What Client Wants, each Criminal Defence Link row, Defence Strategy Plan, Prosecution, Court, Defence, etc. – is wrapped in its own visible box (border/card). No loose “squares”; each one is clearly one box. |
| **Collapsible boxes for big sections** | Big sections (e.g. Incident / Accused Summary, Police / Procedural Summary, Defence Strategy Plan) are collapsible: click to expand (drop down), click again to collapse. |
| **Back to top or sticky box headers** | Either add a “Back to top” arrow so you can get back to the Jump to bar, or use the box layout so section headers stay visible and you don’t need to scroll back up. |

This stays as a **plan only** until you’re ready to implement.

---

## 8. Things to consider (add your own)

Use this section to add ideas, constraints, or “something else” you want to factor in before we code.

- 
- 
- 

**Strategy engine – design principles (when we touch it)**  
*From external review. No code; useful to keep in mind if we ever refactor or extend the strategy engine.*

| Principle | What it means for the plan |
|-----------|----------------------------|
| **Single "brainstem" order** | One deterministic sequence: check disclosure safety → doctrine/constraints → evidence support → score routes → mark viable/risky/blocked. The coordinator already does this; when we change the engine, keep that single entry point and order so behaviour stays predictable. |
| **Four-layer boundary** | Keep clearly separated: **Evidence** (raw from docs) → **Findings** (doctrine-shaped conclusions, e.g. "no targeting") → **Strategy** (which route is viable) → **Actions** (what to do next). Helps keep the system auditable and easier to trust; we're already close, just formalise if we refactor. |
| **Route = state + trigger + pivot** | Each route has state (viable / risky / blocked). Triggers = e.g. "evidence arrives", "disclosure complete". Pivot = when to switch route. We already have kill_switches and pivot_plan; when we add or change routes, encode triggers and pivots explicitly so it stays deterministic. |

---

## 10. Solicitor pain points – what criminal defence teams struggle with (and what CaseBrain could add)

*Research: legal aid crisis, disclosure/digital burden, court deadlines, billing, client communication, sentencing prep. Below = real pain points + concrete ideas for the product.*

### What solicitors struggle with

| Area | Pain point |
|------|------------|
| **Court dates & deadlines** | Missing a hearing = warrant, bail failure, or conviction in absence. Clients (and sometimes fee earners) forget dates. Reminders (1/7/15/30 days before) are critical; many still rely on paper diaries or generic calendars. |
| **Disclosure chase** | Prosecution disclosure is late or incomplete. MG6 schedules (MG6B/C/D/E – unused material, sensitive material, third‑party) drive what defence can request. Chasing "requested vs received", and knowing what's still outstanding, is manual and easy to drop. |
| **Digital / volume** | 2024 AG Guidelines expanded digital material; huge volumes of CCTV, messages, body‑worn. Hard to track what's been received, reviewed, and what still needs chasing. |
| **Legal aid viability** | Rates are tight; profitability depends on efficient time recording and correct CRM forms (CRM6, 7, 11, 18). Many use separate billing tools (Lawsyst, BLAid, LEAP); knowing *which* cases are legal aid and need that workflow is basic but often not surfaced in "strategy" tools. |
| **Client communication** | Clients expect updates; SRA/professional expectations too. No standard "last contact" or "next update due" in many practice systems – so things get missed. |
| **Sentencing prep** | Mitigation needs structure: client background, offence circumstances, risk/rehab, supporting docs (PSR, references, medical). Easy to miss a factor or document without a checklist. |
| **Everything in one place** | Strategy, disclosure status, next hearing, client wishes, and key docs are scattered across emails, files, and different systems. One place that ties case strategy + hearings + disclosure + docs is rare for criminal defence. |

### What CaseBrain could add (when you're ready)

| Idea | What it is | Why it helps |
|------|------------|--------------|
| **Hearing reminders / "next hearing" prominent** | Per case: next hearing date + type; optional reminder (e.g. 7 days before). Dashboard or case header: "Next: PTPH 12 Feb". | Reduces missed hearings and last‑minute scrambles. |
| **Disclosure chase tracker** | Per case: list of disclosure requests (e.g. MG6C, specific items); status = Requested / Received / Outstanding; optional due date. Surfaces "disclosure outstanding" on dashboard (you already have the hook). | Stops disclosure chase from falling through the cracks. |
| **Legal aid matter flag** | Case-level flag or tag: "Legal aid" (and maybe matter type: magistrates / Crown / police station). No billing inside CaseBrain – just so they see which cases need CRM/billing elsewhere. | Simple; aligns with how they already work with Lawsyst/BLAid etc. |
| **"Last client contact" / "Next update due"** | Two fields per case (or in a small "Client" strip): last contact date, optional "next update by" date. Optional reminder. | Supports professional standards and client expectations without building a full CRM. |
| **Sentencing / mitigation checklist** | For cases heading to sentence: checklist (background, offence circumstances, risk, PSR, references, medical, apology) – tick list or template they can fill. | Ensures nothing is missed in mitigation prep. |
| **Disclosure bundle view** | View or checklist: "Received" vs "Outstanding" by category (e.g. MG6C schedule, CCTV, custody records). Works with your existing doc upload and disclosure outstanding line. | Matches how they think about disclosure; ties to strategy. |

### What to leave to others

- **Full legal aid billing / CRM forms** – Lawsyst, BLAid, LEAP own that. CaseBrain stays strategy + case + disclosure + hearings + docs; a "legal aid" tag is enough.
- **SRA accounts / client money** – Out of scope; no ledgers or accounting.

Use §10 when prioritising "next after trial/payment": e.g. disclosure chase + next hearing prominent are high impact for criminal defence; sentencing checklist and client-contact fields are quick adds.

---

## 11. Pre-demo / trust fixes (before LinkedIn or sales demo)

*External review: contradictions in the case page can look like "the tool can't agree with itself." Fix or hide these before recording.*

### Highest impact (do first)

| # | Issue | Fix |
|---|--------|-----|
| **1** | **Procedural safety contradicts itself** | Top strip says "Safe to proceed" but Safety panel / Supervisor Snapshot say "UNSAFE TO PROCEED" and list critical disclosure missing. **One source of truth:** whatever powers the Safety panel / Supervisor Snapshot should also power the top strip. If safety = UNSAFE, the strip must say UNSAFE. |
| **2** | **"Missing evidence" count inconsistent** | Shows "Missing evidence: 0 missing" and "Unassessed: 5" while Safety says "Missing: 5 item(s)" and lists 5. **Fix:** Don't say "0 missing" if elsewhere you list 5 critical/high missing. Use e.g. **"Missing: 0 · Unassessed: 5"** or **"Outstanding: 5"** and make the label/compute consistent. |
| **3** | **Strategy vs Safety wording clash** | "Strategy still valid" next to Safety "UNSAFE TO PROCEED" feels contradictory. **Fix wording:** e.g. **"Strategy unchanged — blocked by disclosure"** or **"Strategy valid, but cannot proceed until critical disclosure received."** |
| **4** | **Decision Checkpoints** | Plan says removed but block still appears. **Fix:** Fully remove from visible UI or label "Coming soon / disabled" so it doesn't look like dead UI. |

### Demo polish (optional)

| # | Issue | Fix |
|---|--------|-----|
| **5** | **Simulated docs + extraction errors** | PDF parsing errors (bad XRef, token too long) make the system look flaky. **Options:** (a) Use clean text-safe PDFs for demo, or (b) When simulated/demo docs detected, suppress low-level parser errors and show one banner: "Simulated demo docs detected — some files are placeholders." |
| **6** | **Charge panel duplicative** | "3 confirmed" plus multiple "pending" and repeated s18/s20 lines read messy. **Fix for demo:** One clean line e.g. **"s18 OAPA 1861 (alt: s20)"**; hide raw AUTO_EXTRACTED / confidence lines unless `?debug=1`. |

### Where to look (when implementing)

- **Top strip "Procedural safety"** and **Safety panel** likely use two different data sources (e.g. coordinator vs legacy computed state). Unify so both read from the same source.

---

## 9. What’s already done (no action)

- 14-day trial, 2 cases + 10 docs; enforced on upload, intake create-case, analysis.
- Payment setup guide in `docs/PAYMENT_SETUP.md` (implementation still to do).
- All earlier plan items (sidebar, upload polish, Jump to at top, dashboard one-line status, desktop, Decision Checkpoints removed).

---

*Edit this file to add or change items; when you’re ready we can implement from here.*
