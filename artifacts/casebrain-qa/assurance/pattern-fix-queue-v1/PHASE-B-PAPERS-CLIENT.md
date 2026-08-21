# PHASE B — Papers + Client

**Verdict contribution:** Papers inventory + distinct Client Summary shipped and live-proven.  
**Branch:** `fix/f167-surgical-truth-v1`  
**Phase-A-lock SHA:** `cbf40f08f381d1e39d7326059dbe24cb71beacce`  
**Phase-B tip SHA:** `a13739f4bd4f3016ca0c76b25364c36bd44857e8`  
**Preview:** https://casebrain-98u6ps28m-gduffy1993-pngs-projects.vercel.app  
**Locked:** 2026-08-21  
**Integrity / provisional discipline preserved — no invented facts for nicer UI**

---

## Goal

| Surface | Before | After |
|---------|--------|-------|
| Papers | Control Room clone + `MORE PAPERS DETAIL UNAVAILABLE` | Ledger **Papers inventory** (material / type / status / pages-ref) |
| Client Summary | Harness often hit wrong tab → Court CR | `tab=summary` **PilotSummaryView** + “What the papers show” facts strip — not Court pressure desk |

---

## Commits

| SHA | Subject |
|-----|---------|
| `a13739f4b` | feat(ui): Papers doc inventory and distinct Client papers-facts strip |
| `67eb3e4b4` | docs(assurance): Phase A lock (prerequisite) |

Product files:
- `components/criminal/papers/PapersDocInventoryPanel.tsx` (new)
- `components/criminal/CaseControlRoom.tsx` (papers primary = inventory)
- `components/criminal/workflow/PilotSummaryView.tsx` (client papers-facts)
- harness tab ids: `today` / `summary` (was `court` / `client-summary`)

---

## Live proof @ `98u6` (Arden + Brookes + Trap)

| Case | Papers inventory | Papers ≠ Control Room | Client facts strip | Client ≠ Court pressure | Court still has pressure |
|------|------------------|----------------------|--------------------|-------------------------|--------------------------|
| Arden | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** |
| Brookes | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** |
| Trap | **PASS** | **PASS** | **PASS** | **PASS** | **PASS** |

Dumps: `artifacts/.../_live/wave-phase-b-98u6/`

---

## Discipline notes

- Inventory rows come from `buildBundleTruthLedger` materials only — empty state refuses to invent a list.
- Client facts strip maps ledger statuses to plain English; does not invent missing ranges.
- Optional deep papers tools remain behind integrity gate (relabelled “Additional papers tools”).
