# Demo Overview shell v1

**Branch:** `ui/demo-overview-shell-v1`  
**Rule:** brains frozen — presentation only (no invent / chase-gate / hearing logic edits).

## What shipped
- Overview canvas matching the solicitor mock: attention list + selected issue + copy CTAs + court/client/readiness cards
- Wired from existing `useMatterBrief` / chase / five-answers / hearing-mode outputs
- Soft provisional readiness % from evidence/chase counts (labelled soft)
- Tab labels: Court Position / Papers & Evidence / File & Preparation
- Light workspace chrome when shell on; hide duplicate pilot strip + compact actions on Overview

## Flags
- Default **ON** on this branch (`NEXT_PUBLIC_DEMO_OVERVIEW_SHELL` defaults true)
- Opt out: `?classicOverview=1` or `NEXT_PUBLIC_DEMO_OVERVIEW_SHELL=0`
- Force on: `?demoShell=1`

## Not in this pass
- Full sidebar rebuild (Calendar / Reports chrome)
- Court / Chase tab restyle
- Any truth-brain changes
