# Legacy CaseBrain account storage inventory (READ-ONLY)

## Target
- Email: `gduffy1993@gmail.com`
- User ID: `63ccc8dc-842e-49b5-9aa9-dcff8f55eb10`
- Created: 2025-12-24T22:01:59.176892Z
- Last sign-in: 2026-06-20T03:05:32.399648Z

## Chain

| Step | Count |
|------|------:|
| Account found | yes |
| Organisations (solo via external_ref) | 1 primary (+1 secondary with 3 cases) |
| Cases (primary org) | **1117** |
| Cases (created_by user) | 1120 |
| Document records (primary org) | **1117** |
| PDF objects under org storage prefix | **1102** |
| PDF objects listed in entire bucket | 1401 |
| Unique bundles (cases with docs) | **1117** |
| Unique PDF content hashes | sample only (full census not run) |

## Download / materialisation
- Bucket: `casebrain-documents`
- Path pattern: `{orgId}/{caseId}/{timestamp}-{filename}.pdf`
- DB field: `documents.storage_url` (e.g. `casebrain-documents/11f3d373-.../....pdf`); `storage_path` often null
- Service-role download works (read-only). **Do not run auditor yet** — produce full hash manifest next if authorised.

## Is this the believed ~3000 corpus?
**No / not matching.** This account holds ~**1,117** cases and ~**1,102** PDFs in its org prefix — eval/pack style titles — not 3,000 unique messy-v9 identities.

## Related QA alias
`gduffy1993+casebrain@gmail.com`: found userId=c8300c48-f1d9-475d-8b58-4ddd0f35a3db; casesByOrgSum=20; docsByOrgSum=20

## Safety
No password reset. No mutations.
