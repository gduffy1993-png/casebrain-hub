# Codex technical scale-gate acceptance — V2.1.4.4

**accepted:** true  
**effectivePilotVersion:** V2.1.4.4  
**acceptanceScope:** second_diverse_3000_calibration_only  

## Authorisations

| Flag | Value |
|------|-------|
| scaleSelectionPreparationAllowed | true |
| scaleExecutionAllowed | false (until integration baseline is frozen) |
| corpusPassSupported | false |
| stage3000CompletionSupported | false |
| programmePassSupported | false |
| qualifiedSolicitorApproval | false |
| deploymentAuthorised | false |
| mergeAuthorised | false |

## Hashes

- Membership SHA-256: `e103baa3e0e53bc0062b36f3446896337b7ba99e7213fe23c4c34426201edfde`
- Candidate freeze SHA-256: `4a788439aa97be17a73c5ccd066be5725805694a9bc1e4922c44673e44abe3a3`

## Verified evidence (Codex-reviewed)

- Same frozen 20; PDFs not regenerated
- Ordinary non-empty solicitor-visible denominator: **700**
- Empty/not-exercised counted as professional passes: **0**
- Unique ordinary wording strings: **76**
- System/harness wording hits: **0**
- Heading-as-charge / broken joins / lowercase acronyms / unsupported statutory: **0**
- Ordinary visible fail-closed: **0**; derived missing deps: **0**
- Remaining 10 MG6 referral anchors: **protected_audit_only**, non-copyable, outside ordinary exits
- BND-05=**15**; ATR-02=**7**; untriaged=**0**; confirmed app defects in scope=**0**
- PDF / authenticated browser: **not_exercised**
- API: **builder payload only** (not authenticated HTTP)
- Focused contracts / path-scoped tsc / fresh Next build: exit **0**
- Exact evidence manifest: **26/26** SHA-256 + byte-length rows verified against disk

## Additive record

This receipt does **not** rewrite `pilot-gate-result.json`, `STOP-FOR-CODEX-REVIEW.json`, `DECISION-CARD.json`, or `EXACT-SHA256-MANIFEST.json`.

Historical corrective sidecars remain in force for V2.1.4.2 and V2.1.4.3.

## Remaining limitations

Technical pilot scale gate only. Does not authorise the 3,000-case run, corpus PASS, Stage-3000 completion, programme PASS, qualified solicitor approval, merge, or deployment.
