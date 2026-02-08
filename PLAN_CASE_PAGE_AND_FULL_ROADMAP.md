# Case Page Improvements & Full Roadmap

**Ties to:** PLAN_NAV_AND_PAGES.md (nav, dashboard, intake, search – Stages A–E done).  
**This doc:** Case page layout from a professional (solicitor) point of view + full roadmap with everything in one place.

---

## 1. Is the strategy actually good?

**Yes.** The content is solicitor-grade:

- Prosecution burden, defence counters, reassessment triggers, alternative routes
- Legal tests (s18 vs s20, causation, GBH threshold)
- Win conditions and risks per strategy (Fight / Charge reduction / Mitigation)
- Tactical next actions and disclosure-first discipline

**No change to the content of the strategy.** Only layout, order, and navigation.

---

## 2. What to change from a professional (solicitor) point of view

| Priority | Change | Why |
|----------|--------|-----|
| **1** | **Surface "safe to proceed?" and "what's missing?" near the top** | Procedural Safety and Missing Evidence are far down. Add a **Safety & disclosure at a glance** block in the first screen or two (e.g. after Case Files or Key Facts): one line safe/unsafe + critical missing count + link to full Procedural Safety and Disclosure Tracker. |
| **2** | **One "Disclosure status" hub near the top** | Disclosure gaps appear in several places. Add a single **Disclosure status** section early: e.g. "Critical: 2 missing. High: 3. [View full list]." so "what's outstanding?" is answered in one place. |
| **3** | **Sticky or anchor navigation for the long page** | Add **sticky "Jump to"** links or a compact **At a glance** bar (e.g. Safety \| Strategy \| Next steps \| Disclosure \| Bail) so the solicitor can jump to the right section without scrolling. |
| **4** | **Supervisor Snapshot (or one-line version) higher** | Move the full Supervisor Snapshot higher (e.g. after Defence Plan) or repeat a one-line **Supervisor summary** near the top (safe/unsafe, strategy, disclosure count). |
| **5** | **Keep current section order below the fold** | Below the new at-a-glance / Safety / Disclosure hub, keep the existing order. Only add the at-a-glance layer at the top. |
| **6** | **Optional: Next hearing + Next 3 actions in at-a-glance bar** | If we add a sticky bar, include Next hearing (or "Not set") and the next 3 tactical actions. |

**Out of scope (no change):** Strategy logic, route viability, prosecution burden text, legal tests wording, or any "brain" that generates the strategy.

---

## 3. Full roadmap – everything in one place

**Already done (Stages A–E):**

- **A** Fix /intake and /search
- **B** Dashboard (recent cases, primary action, empty state)
- **C** Hide other roles (criminal only)
- **D** Simplify nav (hide Analytics, Templates, Bin)
- **E** OWNER DEBUG only when debug on

**Next (suggested order):**

| Phase | What | Notes |
|-------|------|-------|
| **Confirm** | Sidebar and debug bar | Ensure Analytics, Templates, Bin are hidden in your build; debug bar only with `?debug=1` or setting. |
| **Case page layout** | Safety & disclosure at a glance near top; one Disclosure status hub; sticky/anchor nav; Supervisor summary higher | Section 2 above. No strategy content change. |
| **Dashboard one-line status** | Add "Strategy: …" and "Disclosure: X outstanding" per case row | Needs list-level API for strategy and disclosure count. |
| **Upload polish** | Clearer post-upload (Attach / Create case / Intake); optional "Recently uploaded" list with filename + date | Optional; upload already works. |
| **Intake bulk** | "Attach selected to case X" or "Create case from selected" | Optional. |
| **Analytics (if brought back)** | Criminal-only metrics; drop Billable hours / Avg settlement unless needed | Optional. |
| **Search in documents** | Second scope/tab to search inside case docs | Optional. |
| **Templates / Bin** | If shown: criminal labels for templates; Bin with Deleted date and Restore | Optional. |
| **Desktop** | Electron or Tauri wrapper when you want an installed app | When you're ready. |

**Strategy quality:** No change. We only make the same content easier to find and act on.

---

## 4. Summary

- **Case page:** Strategy is good; we improve **layout** (safety/disclosure at top, one hub, sticky nav, Supervisor higher).
- **Rest of app:** Per PLAN_NAV_AND_PAGES.md (dashboard, cases, intake, search, nav, roles, debug).
- **Full order:** Confirm build → Case page layout → Dashboard one-line → Upload polish → then optional items (intake bulk, analytics, search in docs, templates/bin, desktop).

No code until you say "go" on this plan (or a trimmed version).

---

## 5. Step-by-step plan (so we don't mess it up)

**Rule:** One step at a time. Test after each step. Don't skip ahead. Strategy and case page *content* never change – only layout, nav, and list/UI.

---

### Already done (nothing to redo)

| Step | What | Status |
|------|------|--------|
| A | Fix /intake and /search so they load (no 500) | Done |
| B | Dashboard: recent cases, primary action, empty state | Done |
| C | Hide other solicitor roles (criminal only) | Done |
| D | Simplify nav: hide Analytics, Templates, Bin | Done |
| E | OWNER DEBUG bar only when debug on (?debug=1 or setting) | Done (yellow bar removed by default) |

---

### Next steps (in this order)

| Step | What | Risk | Notes |
|------|------|------|--------|
| **1** | **Confirm** | None | Check your build: sidebar shows only Dashboard, Cases, Upload, Intake, Search, Settings. Debug bar only with ?debug=1. No code – just verify. |
| **2** | **Case page layout** | Low | Add at top only: (a) Safety & disclosure at a glance, (b) one Disclosure status hub, (c) sticky/anchor nav (Jump to: Safety \| Strategy \| Next steps \| Disclosure \| Bail), (d) Supervisor summary higher. Rest of page order unchanged. Strategy content unchanged. |
| **3** | **Dashboard one-line status** | Low | Add "Strategy: …" and "Disclosure: X outstanding" per case row when backend/API supports it. |
| **4** | **Upload polish** | Low | Clearer post-upload block (Attach / Create case / Intake). Optional: "Recently uploaded" list with filename + date. |
| **5** | **Intake bulk** (optional) | Low | "Attach selected to case X" / "Create case from selected". Skip if you don't need it yet. |
| **6** | **Analytics** (optional) | Low | Only if you bring it back: criminal-only metrics; drop Billable hours / Avg settlement unless needed. |
| **7** | **Search in documents** (optional) | Low | Second scope/tab to search inside case docs. Skip if not needed yet. |
| **8** | **Templates / Bin** (optional) | Low | If you show them again: criminal labels for templates; Bin with Deleted date and Restore. |
| **9** | **Desktop version** | Medium | When you're ready: add Electron or Tauri wrapper that loads your app (same URL or built bundle). Same app, same strategy – just runs in a desktop window. Plan: one codebase; desktop = packaging step later. |

---

### Desktop – short list (what we said before)

- **What it is:** Same CaseBrain app, but packaged so it runs as a desktop app (Windows/Mac, optionally Linux).
- **Options:** **Electron** (mature, heavier) or **Tauri** (lighter, uses OS web view). Or **PWA** (install from browser – no separate desktop build).
- **When:** After the steps above are solid. No change to strategy or case page – just a wrapper that opens the app in its own window.
- **How we don't mess it up:** Desktop is a separate packaging step. We don't touch the Next.js app or strategy; we add a small project (Electron or Tauri) that loads your deployed URL or a build. Test the web app first; then add the desktop shell.

---

### Full list in one line

**Done:** A (intake/search) → B (dashboard) → C (criminal only) → D (nav) → E (debug bar). Step 2 (case page at-a-glance + sticky nav) is also done in code.  
**Next:** 1 Confirm → 3 Dashboard one-line → 4 Upload polish → 5–8 Optional → **9 Desktop** (Electron or Tauri wrapper – same app, runs in desktop window). Desktop is part of the plan; we build it when you say go.
