# GOLD-11-019 — solicitor-visible render

**Stratum:** provenance
**Fixture:** CASE-07:demo-audit-44-bad-redaction
**Source kind:** gold_manual_pack
**Selection reason:** Gold pack bad-redaction provenance risk
**Review focus:** Provenance / redaction-safe display.

> This file shows text a solicitor would see (or an explicit COPY/EXPORT UNAVAILABLE banner).
> Blocked output is containment — **not** substantive repair.
> Human judgments belong in `human-judgment-workbook.json` only.

## Case header (solicitor view)

- Surface id: `case_header`
- Gate status: `display`
- canCopy: `true`

```text
Client: Farah Kent
Allegation: Stalking, contrary to section 2A of the Protection from Harassment Act 1997
```

## Court line (copy preview)

- Surface id: `court_line`
- Gate status: `ok`
- canCopy: `true`

```text
The defence asks the court to record that redacted papers are served but the unredacted MG11, redaction schedule, and full police note remain outstanding before the defence relies on the redacted text.
```

## Client-safe summary preview

- Surface id: `client_summary`
- Gate status: `display`
- canCopy: `true`

```text
CLIENT-SAFE SUMMARY
(not for court or CPS)

We are reviewing the papers in your case (Farah Kent). This is early-stage — nothing is final until we have full disclosure and your instructions. Redacted papers are on the bundle, but the unredacted MG11, redaction schedule, and full police note remain outstanding. Do not treat redacted text as if the full unredacted material were served.

[CaseBrain — client-safe summary. Evidence state: provisional. Not for court or CPS use.]
```

## CPS chase — unredacted mg11

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide unredacted mg11 or confirm in writing why it is not available.
```

## CPS chase — redaction schedule

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide redaction schedule or confirm in writing why it is not available.
```

## CPS chase — full police note

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide full police note or confirm in writing why it is not available.
```

## Evidence truth map (Overview)

- Surface id: `truth_map`
- Gate status: `display`
- canCopy: `true`

```text
• witness MG11 — not_safely_confirmed
• custody extract — not_safely_confirmed
• unredacted mg11 — missing
• redaction schedule — missing
• full police note — missing
```

## Do-not-overstate warnings

- Surface id: `do_not_overstate`
- Gate status: `warning`
- canCopy: `false`

```text
• unsafe proof/outcome wording blocked
• Do not rely on redacted text as if the unredacted MG11 and schedule were served.
```
