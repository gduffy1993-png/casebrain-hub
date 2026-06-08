# Review & Confirm (replaces Phase 1/2/3 gates)

## Migration

Run in Supabase SQL Editor (or `supabase db push`):

- **`20260220000000_review_confirmed_at.sql`** — adds `review_confirmed_at` on `criminal_cases` and backfills from existing `case_strategy_commitments` and `case_positions` so current cases skip the gate.

## Flow

1. Open criminal case → GET `/api/criminal/[caseId]/phase1-detect` includes `reviewConfirmedAt`.
2. If **null** → full-page **Review & Confirm** (`CaseReviewConfirm`): POST phase1-detect, edit offence / stance / stage / strategy override / defence plan narrative, then **Confirm & start strategy**.
3. POST `/api/criminal/[caseId]/review-confirm` writes `criminal_cases` (offence, stance, stage, `review_confirmed_at`, optional `agreed_summary_detailed`) and inserts `case_strategy_commitments`.
4. If **set** → normal **CriminalCaseView** (no phase selector; workspace treated as unlocked).

## Authority

- **Snapshot** (offence, stance, stage, committed strategy) is authoritative for Chat + Strategy.
- Defence plan **text** on Review is narrative (`agreed_summary_detailed`); it does not override the four core fields.

## Removed from UI

- **Case phase** selector (Phase 1/2/3). Replaced by a short note that the case was confirmed via Review & Confirm.

## Files

- `components/criminal/CaseReviewConfirm.tsx`
- `app/api/criminal/[caseId]/review-confirm/route.ts`
- `lib/criminal/review-confirm-ui.ts` — stance options by offence, strategy preview
- `components/criminal/CriminalCaseView.tsx` — gate + `workspacePhase` 3
