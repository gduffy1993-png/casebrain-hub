# GOLD-11-010 — solicitor-visible render

**Stratum:** blocked_containment
**Fixture:** proof-pack-01
**Source kind:** phase9_pack_seed
**Selection reason:** Phase 9 possible_fp_overblock — containment blocks present
**Review focus:** Is fail-closed over-blocking safe solicitor wording? (FP). Blocked ≠ repaired.

> This file shows text a solicitor would see (or an explicit COPY/EXPORT UNAVAILABLE banner).
> Blocked output is containment — **not** substantive repair.
> Human judgments belong in `human-judgment-workbook.json` only.

## Overview evidence counts

- Surface id: `overview_counts`
- Gate status: `display`
- canCopy: `true`

```text
Served 2 · Referred 1 · Missing 1 · Incomplete 0 · Not safely confirmed 3
```

## Hearing status

- Surface id: `hearing_status_strip`
- Gate status: `unknown`
- canCopy: `true`

```text
Hearing date not safely extracted
```

## Offence-family resolution

- Surface id: `offence_family`
- Gate status: `uncertain`
- canCopy: `true`

```text
Resolved family: unknown
Audit family seed: unknown
```

## Disclosure chase brief (solicitor list)

- Surface id: `chase_brief`
- Gate status: `display`
- canCopy: `true`

```text
Total 1
• source material / source evidence behind allegation
```

## Copy preview (sample line)

- Surface id: `copy_preview`
- Gate status: `integrity_blocked`
- canCopy: `false`

```text
COPY UNAVAILABLE — Solicitor review required — output integrity check failed.
Blocked source (not repaired):
2026-06-29T13:26:34.086Z
```

## Copy preview (sample line)

- Surface id: `copy_preview`
- Gate status: `integrity_blocked`
- canCopy: `false`

```text
COPY UNAVAILABLE — Solicitor review required — output integrity check failed.
Blocked source (not repaired):
CaseBrain H5 presentation builders (no Brain 1 mutation)
```

## Copy preview (sample line)

- Surface id: `copy_preview`
- Gate status: `integrity_blocked`
- canCopy: `false`

```text
COPY UNAVAILABLE — Solicitor review required — output integrity check failed.
Blocked source (not repaired):
buildStrategyBattleboard
```

## Copy preview (sample line)

- Surface id: `copy_preview`
- Gate status: `integrity_blocked`
- canCopy: `false`

```text
COPY UNAVAILABLE — Solicitor review required — output integrity check failed.
Blocked source (not repaired):
buildDisclosureChaseBrief
```

## Copy preview (sample line)

- Surface id: `copy_preview`
- Gate status: `integrity_blocked`
- canCopy: `false`

```text
COPY UNAVAILABLE — Solicitor review required — output integrity check failed.
Blocked source (not repaired):
buildHearingWarRoomBrief
```

## Copy preview (sample line)

- Surface id: `copy_preview`
- Gate status: `integrity_blocked`
- canCopy: `false`

```text
COPY UNAVAILABLE — Solicitor review required — output integrity check failed.
Blocked source (not repaired):
inferChaseItemSourceState
```

## Cross-family leak probe (copy)

- Surface id: `family_leak_probe`
- Gate status: `integrity_blocked`
- canCopy: `false`

```text
COPY UNAVAILABLE — family containment blocked probe.
Banner: Solicitor review required — output integrity check failed.
```

## Central surface sample (overview_safe_wording_card)

- Surface id: `central_surface_sample`
- Gate status: `integrity_blocked`
- canCopy: `false`

```text
SURFACE NOT COPYABLE — status=integrity_blocked; rules=offence_family_uncertain
```
