# DECISION CARD — Stage-3000 Existing Census Final Corrections

Authority baseline: `ca51ecba8fd70762488c43c69a4cdda3de9b8566`  
Frozen membership: `dcf6c382fe1b41ef34624c03764c8dc785de04a13f5344784aee03b9a192d4ae` (unchanged)  
Intermediate historical post-fix preserved at:  
`stage3000-existing-census-v1-post-fix-intermediate-historical/`  
Final run: `stage3000-existing-census-v1-final-corrections` (surfaces `run-v11`)  
Programme PASS: **false** · Stage-3000 completion: **false**

## What was actually exercised?
- Same frozen 3000.
- Removed remaining internal/audit language from export (and all visible) blocked wording.
- Registry-derived family issue-code leak detection + expanded internal-language boundary scan on **all** visible surfaces including blocked/non-copyable.
- Rematerialise `run-v11` + automatic checkpoints 20→3000.
- Finding-code delta reconciliation for large count reductions.

## What was not exercised?
- Authenticated browser; second new 3000 corpus; human/legal approval claims.

## What genuine defects were found / fixed?
- Shared RAW_ENUM (279 confirmed + 40 unresolved = 319) → **0**.
- Residual export phrase naming “internal detector / protected audit metadata” → removed; professional what/why/next retained.
- MG5/MG6 provenance title false positives correctly removed (not defects).

## Shared causes / reconciliation
- Enum codes joined into blocked reasons (fixed earlier; preserved).
- Export still mentioned internal audit mechanics (fixed now).
- Containment 6600→2200 = removal of 4400 MG5/MG6 title false positives, **not** loss of genuine containment (2200 remain).

## Still requires human/legal/browser/external review?
- Remaining court-line / quarantine professional-wording technical review (390).
- Unresolved-source honest gaps (980).
- Prior Stage-300 open items.

## Same frozen 3000 ready for remediation/rerun?
- Membership hash unchanged — yes.
- No programme PASS / Stage-3000 completion.

### Acceptance
- raw enum surface leaks: **0**
- internal system-language surface leaks: **0**
- Brain1/Guardian unchanged: **true**
- Final dispositions: {"containment":2200,"unresolved_source":980,"professional_wording_review_required":390}
