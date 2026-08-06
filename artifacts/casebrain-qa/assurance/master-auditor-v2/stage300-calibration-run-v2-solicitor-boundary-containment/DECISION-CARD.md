# DECISION CARD — Professional copy prose + manifest self-hash

**Status:** COMPLETE_UNCOMMITTED — stop for Codex review  
**Freeze:** `23ae1b9d…` unchanged  

## A — Supervisor copyable text
`payloadText` is plain professional prose (summary, findings bullets, limitations, required action).  
Structured fields (`audit`, hashes, finding kinds) live in `machineMetadata` only.  
`audiencePackCopyablePayloadText` returns prose and refuses JSON-shaped supervisor blobs.

## B — Manifest self-hash
`COMMIT-SCOPE-MANIFEST-EXACT.json` **excludes itself** from `files[]` (`selfHashStatus=excluded_from_files_array_self_referential`).  
Detached digest: `COMMIT-SCOPE-MANIFEST-EXACT.DIGEST.json`.  
Validation: `manifest-hash-validation.json` — **56** claimed hashes, **0** mismatches, `fullyReconciled=true`.

## Gates
Focused contracts PASS · structural scan clean · protected raw 270/270 · npm build exit 0 · freeze/Brain1 unchanged · tsc path errors 0.

No commit / Stage-300 completion / programme PASS / merge / deploy.
