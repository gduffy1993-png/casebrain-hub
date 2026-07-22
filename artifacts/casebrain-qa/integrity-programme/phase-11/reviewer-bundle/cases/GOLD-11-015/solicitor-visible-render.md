# GOLD-11-015 — solicitor-visible render

**Stratum:** offence_family
**Fixture:** CASE-01:demo-audit-01-phone-harassment
**Source kind:** gold_manual_pack
**Selection reason:** Gold pack harassment family with attribution gaps
**Review focus:** Family-correct wording; no overstated attribution.

> This file shows text a solicitor would see (or an explicit COPY/EXPORT UNAVAILABLE banner).
> Blocked output is containment — **not** substantive repair.
> Human judgments belong in `human-judgment-workbook.json` only.

## Case header (solicitor view)

- Surface id: `case_header`
- Gate status: `display`
- canCopy: `true`

```text
Client: Riley Moss
Allegation: Harassment, contrary to section 2 of the Protection from Harassment Act 1997
```

## Court line (copy preview)

- Surface id: `court_line`
- Gate status: `ok`
- canCopy: `true`

```text
The defence asks the court to record per MG6C that screenshot/message material is served but full phone download, subscriber/account data, and final MG11 remain outstanding.
```

## Client-safe summary preview

- Surface id: `client_summary`
- Gate status: `display`
- canCopy: `true`

```text
CLIENT-SAFE SUMMARY
(not for court or CPS)

We are reviewing the papers in your case (Riley Moss). This is early-stage — nothing is final until we have full disclosure and your instructions. Screenshots of messages are on the papers, but the full phone download, subscriber/account data, and final signed statement are still outstanding. We cannot yet confirm who sent each message from the served material alone.

[CaseBrain — client-safe summary. Evidence state: provisional. Not for court or CPS use.]
```

## CPS chase — Full phone download

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide Full phone download (see MG6C/004) or confirm in writing why it is not available.
```

## CPS chase — Subscriber / account data

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide Subscriber / account data (see MG6C/003) or confirm in writing why it is not available.
```

## CPS chase — Full message export

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide Full message export (see MG6C/001) or confirm in writing why it is not available.
```

## CPS chase — Final signed MG11

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide Final signed MG11 (see MG6C/007) or confirm in writing why it is not available.
```

## Evidence truth map (Overview)

- Surface id: `truth_map`
- Gate status: `display`
- canCopy: `true`

```text
• Screenshot / message pack — served
• Phone extraction summary — served
• Device metadata export — referred_only
• Complainant MG11 (draft) — served
• Attribution / subscriber material — not_safely_confirmed
• Full phone download — missing
• Subscriber / account data — missing
• Full message export — missing
```

## Do-not-overstate warnings

- Surface id: `do_not_overstate`
- Gate status: `warning`
- canCopy: `false`

```text
• defendant sent the messages
• Riley Moss sent
• attribution is proved
• Do not state the defendant sent messages unless attribution is served and safe.
• Do not treat draft/unsigned MG11 as a final served statement.
```
