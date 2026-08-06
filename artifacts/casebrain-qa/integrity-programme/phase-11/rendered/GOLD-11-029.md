# GOLD-11-029 — solicitor-visible render

**Stratum:** copy_export_api
**Fixture:** SYN-API-BLOCK-01
**Source kind:** synthetic_controlled
**Selection reason:** Integrity-blocked API body must not be usable content
**Review focus:** API/UI banner and canCopy=false; blocked ≠ repaired.

> This file shows text a solicitor would see (or an explicit COPY/EXPORT UNAVAILABLE banner).
> Blocked output is containment — **not** substantive repair.
> Human judgments belong in `human-judgment-workbook.json` only.

## API consumer UI state

- Surface id: `api_consumer_ui`
- Gate status: `integrity_blocked`
- canCopy: `false`

```text
Solicitor review required — output integrity check failed.
```

## canUseSolicitorApiResponse

- Surface id: `api_usable_check`
- Gate status: `consumer_reject`
- canCopy: `false`

```text
NOT USABLE — integrity_blocked payload rejected by consumer
```
