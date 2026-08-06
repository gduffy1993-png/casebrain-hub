# Security and External Assurance Roadmap (MAA V2)

**Status:** non-PASS roadmap  
**Families:** U (SEC), V (IAM), W (RES), parts of T (PRV), X (OPS), AF (EXT)  

## Hard rules

1. **Automated scans are not a penetration test.**
2. **Readiness is not certification.**
3. **Do not self-award** ISO/IEC 27001, SOC 2 Type II, penetration-test pass, legal approval, or independent solicitor sign-off.
4. Missing external evidence → `not_exercised` or `unresolved` — **never** `pass`.
5. Do not claim SSO implemented where only readiness exists.
6. Do not claim UK-only residency unless every relevant storage and processing path proves it.

## Roadmap items (AF)

| ID | Item |
|----|------|
| `MAA2-EXT-01-INDEPENDENT-SOLICITOR-REVIEW` | Independent solicitor review |
| `MAA2-EXT-02-PENTEST-RETEST` | Independent penetration test and retest |
| `MAA2-EXT-03-DPIA-PRIVACY-REVIEW` | DPIA / privacy review |
| `MAA2-EXT-04-SUBPROCESSOR-TRANSFER-REVIEW` | Subprocessor and international-transfer review |
| `MAA2-EXT-05-ACCESSIBILITY-REVIEW` | Accessibility review (beyond automated scans) |
| `MAA2-EXT-06-ISO27001-READINESS` | ISO/IEC 27001 readiness and certification path |
| `MAA2-EXT-07-SOC2-READINESS` | SOC 2 Type II readiness and operating-evidence period |
| `MAA2-EXT-08-SSO-IMPLEMENTATION` | SSO implementation (distinct from readiness) |
| `MAA2-EXT-09-CONFIGURABLE-RESIDENCY` | Configurable data-residency implementation |

## Technical control families (summary)

- **U Security:** prompt injection in documents; malicious PDFs; file-type spoofing; zip bombs; path/ID leakage; secret leakage; API authz; tenant isolation; role escalation; IDOR; cross-org search/download; session handling; rate limits; unsafe links; dependency vulns; encryption evidence; safe logging.
- **V Identity/SSO:** unique identity; MFA; enterprise SSO/federation; IdP validation; RBAC/least privilege; JML lifecycle; admin separation; audit logging; session revocation; emergency access; org boundaries — readiness vs implemented must stay distinct.
- **W Residency:** DB, object storage, backup/DR, logging/analytics, temp processing, AI-provider locations, subprocessors, retention/deletion routes, international-transfer mechanism, customer-configurable options.

## Receipt schemas

- `maa-v2-receipt-security-scan@1`
- `maa-v2-receipt-roadmap-record@1`
- `maa-v2-receipt-residency-inventory@1`
- `maa-v2-receipt-browser-session@1` (for exercised authz paths)

## Relation to V1

Extends `MAA-SECURITY-PRIVACY` and `MAA-RESILIENCE` without altering Stage-20/50 historical findings.
