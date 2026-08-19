# Solicitor Dashboard UI (presentation-only)

Branch: `ui/solicitor-dashboard-v1`  
Worktree: `casebrain-hub-wt-solicitor-dashboard-ui`

## What this is

Premium solicitor desk chrome matching the Aug 2026 mockup:

- dark left sidebar + recent cases
- white case workspace
- case header (client / charge / provisional / counters)
- tabs: Overview, Court Position, Papers & Evidence, Client Summary, CPS Chase, File & Preparation
- Overview: What Needs Attention + selected issue detail + quick cards

## Flags

- Enabled when criminal pilot mode is on (`NEXT_PUBLIC_CRIMINAL_PILOT_MODE=true`)
- Override off: `NEXT_PUBLIC_SOLICITOR_DASHBOARD_UI=0`

## Safety

- Uses `useMatterBrief` + typed `buildSolicitorDashboardVm` adapter only
- Does **not** change evidence/chase/extraction/canonical/auditor logic
- Missing fields → “not safely identified” placeholders
- Provisional / solicitor-review wording kept visible

## Classic pilot chrome

Set `NEXT_PUBLIC_SOLICITOR_DASHBOARD_UI=0` to fall back to `CaseWorkflowShell` + `FiveAnswersView`.
