# Sealed unseen holdout custody protocol

**Status:** DRAFT FOR REVIEW — PROTOCOL ONLY — HOLDOUTS NOT CREATED  
**Planned denominator:** four sealed unseen matters, separate from the 18 core matters  
**Prepared:** 2026-07-23  

## Purpose and boundary

This protocol preserves a genuinely unseen final-validation set. It defines custody and unsealing controls only. It does **not** select, author, describe or create any holdout matter, source bundle, truth key or expected answer.

The four holdouts do not enlarge the 18-core design/remediation denominator. Their results must be reported separately and cannot establish universal coverage.

## Roles and separation of duties

| Role | Permitted access | Prohibited access/action |
|---|---|---|
| Holdout author | Creates fictional holdout sources and truth materials in the isolated holdout environment after separate authorisation | No remediation work; no disclosure of facts or expected answers to remediation agents |
| Holdout custodian | Controls encryption/storage, hashes, access log, release tokens and unsealing | Must not alter truth content or advise remediation using sealed facts |
| Validation operator | Receives sealed input bundles without truth keys and runs the frozen system under the approved procedure | No truth-key or expected-answer access before output freeze |
| Independent scorer | Receives frozen outputs and sealed scoring materials only after the output freeze | No participation in system remediation for the validation release being scored |
| Review chair / authoriser | Confirms role separation, authorises unsealing and freezes the final result | Cannot waive access events or retrospectively change denominators |
| Remediation agents, including Codex/Cursor/developers | May see only the public protocol, aggregate coverage labels and the final independently released result | No access to holdout facts, source documents, truth keys, expected answers, scoring keys or case-specific diagnostics before authorised post-result release |

The holdout author and custodian should be independent people where feasible. If that is not feasible, use an isolated account/environment with independently controlled release credentials and an audit log that the remediation team cannot amend. The exception and compensating controls must be approved before creation.

## Isolation model

- Store holdout materials outside the working repository and ordinary development search/index/cache paths.
- Use a dedicated encrypted location with least-privilege accounts and no automatic synchronisation into development tools.
- Disable ingestion by general code search, embeddings, model context, backup previews and CI artefact publication unless the isolated protocol expressly covers them.
- Keep a public manifest containing only protocol version, planned count, opaque holdout IDs, cryptographic algorithms and sealed timestamps. It must contain no facts, filenames that reveal facts, offence labels or expected answers.
- Do not put secrets, decryption keys or passwords in repository files, command history, logs or validation outputs.

## Required sealed objects and hashes

For each opaque holdout ID, the custodian records hashes without exposing content:

| Object | Required record |
|---|---|
| Source bundle manifest | Ordered file list with size, media type and SHA-256 per file; encrypted manifest hash in public/limited ledger |
| Compiled bundle, if applicable | Exact-byte SHA-256 plus page count and build-manifest hash |
| Matter definition | SHA-256 of canonical sealed representation |
| Truth key | SHA-256 of canonical sealed representation; stored separately from validation inputs |
| Expected-answer/scoring key | SHA-256 of canonical sealed representation; stored with scorer-release controls |
| Acceptance/scoring schema | Version and SHA-256; public schema may be visible if it contains no matter facts |
| Sealed package | Encryption method/version, ciphertext hash, creation timestamp and custodian signature/attestation |

Hashing establishes byte identity, not legal or factual correctness. Any content amendment creates a new version and new hashes; the previous sealed version remains preserved with a reason and authorisation record.

## Access-event ledger

Every attempted or successful access is append-only and records:

- timestamp with timezone;
- opaque holdout ID and object class;
- actor identity, role and authenticated account;
- action: create, hash, seal, copy, view, decrypt, validate, score, unseal or destroy-key/archive;
- purpose and authorisation reference;
- success/denial result;
- source and destination security domains;
- hashes before/after any authorised transfer; and
- custodian attestation plus reviewer for exceptional access.

Unauthorised or unexplained access is a validation-integrity incident. The affected holdout is quarantined; it cannot silently remain in the unseen denominator.

## Pre-validation gate

The review chair must confirm all of the following before a validation run:

1. exactly four opaque holdout memberships were frozen under separate authorisation;
2. source, truth and scoring hashes match the sealed ledger;
3. no remediation agent has a recorded access event;
4. the system version, configuration, prompts/rules, dependencies and regression results are frozen and identified;
5. the 18-core design/remediation evaluation is closed for this validation release;
6. the scorer and validation operator identities are recorded and their roles separated;
7. output destinations are isolated and write-once/versioned; and
8. no truth-key-dependent adaptive rerun is permitted.

Failure of this gate stops validation and does not authorise unsealing.

## Validation and output freeze

- The validation operator receives only the input package needed to run the system, never truth or expected-answer material.
- Run the predetermined exits and audiences once under the frozen configuration. Operational reruns are allowed only for documented infrastructure failure before any truth unsealing; retain all attempts.
- Capture raw outputs, errors, blocked states, logs, configuration identity and run timestamps.
- Produce an output manifest with a SHA-256 for every output and a root/manifest hash.
- The validation operator and custodian attest the output freeze before the scorer receives any truth material.
- No output may be edited, regenerated, filtered or replaced after truth unsealing. Any supplementary analysis is a new, clearly labelled post-result artefact.

## Scorer identity and independence record

The score release records blank fields until a real person completes them:

| Field | Entry |
|---|---|
| Scorer name |  |
| Professional role / qualification |  |
| Organisation / independent capacity |  |
| Conflict declaration |  |
| Prior remediation involvement |  |
| Date and timezone |  |
| Signature / attestation reference |  |
| Scoring-schema version/hash |  |
| Output-freeze manifest hash |  |

The scorer applies the approved source-level metrics: mandatory-finding recall, unsupported-statement precision, provenance correctness, defendant/matter isolation and audience leakage. Substantive repair and containment remain separate outcomes.

## Unsealing procedure

1. Review chair verifies the pre-validation gate and output-freeze attestations.
2. Custodian records the unsealing authorisation, actors, time, objects and target scoring environment.
3. Release only the truth/scoring objects required by the independent scorer; remediation agents remain excluded.
4. Verify released plaintext against the pre-recorded hashes before scoring.
5. Score frozen outputs without adaptive regeneration.
6. Freeze the scored result, discrepancy list, exclusions and scorer notes; hash the result package.
7. Review chair signs the result freeze and decides the level of post-result disclosure.
8. Only after the final-validation result is frozen may authorised findings be released for failure analysis.

## Post-result failure handling

- First preserve the failure exactly as observed: source hash, output hash, metric, severity, audience/exit and scorer rationale.
- Do not feed holdout truth keys or expected answers directly into a fix, prompt, fixture, case-specific condition or regression oracle before the final result is frozen and independently reviewed.
- Classify whether the failure indicates extraction, classification, evidence-state, provenance, charge, composer, gate, presentation, security or isolation logic.
- Any later remediation must be shared and generic, with non-holdout positive contracts and negative controls. Never patch by holdout ID, facts, names, filenames or exact sentence.
- Once a holdout’s details are released to remediation agents, it is no longer unseen. It remains historical validation evidence but cannot be reused as an unseen holdout in a later headline denominator.
- A replacement holdout requires separate authorisation, independent creation and a new sealed membership; it must not erase the original failure.
- Report improved, regressed, unchanged-safe, unchanged-defective and still-blocked outcomes separately. Blocking is not automatically substantive repair.

## Incident and exclusion rules

Premature access, hash mismatch, missing log events, scorer conflict, truth-dependent rerun or output alteration triggers an incident review. The review chair must either:

- exclude the affected holdout with the original denominator and reason visible; or
- invalidate the entire validation run where independence cannot be reconstructed.

No quiet replacement, denominator reduction or retrospective waiver is permitted.

## Current state

| Item | State |
|---|---|
| Protocol drafted | Yes — review only |
| Holdout author/custodian appointed | No |
| Holdout matters created | **No** |
| Holdout facts or truth keys created | **No** |
| Validation authorised | No |
| Unsealing authorised | No |

**Stop condition:** review and approve this protocol before appointing roles or creating any holdout content.
