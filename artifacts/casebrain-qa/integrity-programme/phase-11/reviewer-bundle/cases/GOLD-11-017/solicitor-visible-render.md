# GOLD-11-017 — solicitor-visible render

**Stratum:** hearing_time
**Fixture:** CASE-08:demo-audit-69-charge-mg5-hearing
**Source kind:** gold_manual_pack
**Selection reason:** Gold pack charge/MG5/hearing surface
**Review focus:** Hearing/date presentation accuracy.

> This file shows text a solicitor would see (or an explicit COPY/EXPORT UNAVAILABLE banner).
> Blocked output is containment — **not** substantive repair.
> Human judgments belong in `human-judgment-workbook.json` only.

## Case header (solicitor view)

- Surface id: `case_header`
- Gate status: `display`
- canCopy: `true`

```text
Client: Jordan Hale
Allegation: Battery, contrary to section 39 of the Criminal Justice Act 1988
```

## Court line (copy preview)

- Surface id: `court_line`
- Gate status: `integrity_blocked`
- canCopy: `false`

```text
COPY UNAVAILABLE — Solicitor review required — output integrity check failed.
Underlying court line was gated (blocked ≠ repaired):
The defence asks the court to record that the charge wording, MG5 summary, and hearing/listing position require alignment before the defence position is fixed.
```

## Client-safe summary preview

- Surface id: `client_summary`
- Gate status: `display`
- canCopy: `true`

```text
CLIENT-SAFE SUMMARY
(not for court or CPS)

We are reviewing the papers in your case (Jordan Hale). This is early-stage — nothing is final until we have full disclosure and your instructions. The live issue is whether the charge wording, the MG5 offence summary, and the court listing/hearing position line up. Until those are aligned and confirmed, treat the charge/listing position as provisional — do not assume the papers already fix the offence wording or hearing date.

[CaseBrain — client-safe summary. Evidence state: provisional. Not for court or CPS use.]
```

## CPS chase — corrected charge sheet

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide corrected charge sheet or confirm in writing why it is not available.
```

## CPS chase — updated mg5

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide updated mg5 or confirm in writing why it is not available.
```

## CPS chase — court listing confirmation

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide court listing confirmation or confirm in writing why it is not available.
```

## Evidence truth map (Overview)

- Surface id: `truth_map`
- Gate status: `display`
- canCopy: `true`

```text
• witness MG11 — not_safely_confirmed
• custody extract — not_safely_confirmed
• corrected charge sheet — missing
• updated mg5 — missing
• court listing confirmation — missing
```

## Do-not-overstate warnings

- Surface id: `do_not_overstate`
- Gate status: `warning`
- canCopy: `false`

```text
• unsafe proof/outcome wording blocked
• Do not treat draft/unsigned MG11 as a final served statement.
```
