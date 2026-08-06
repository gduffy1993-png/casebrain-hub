# GOLD-11-016 — solicitor-visible render

**Stratum:** provenance
**Fixture:** CASE-05:demo-audit-05-encro-attribution
**Source kind:** gold_manual_pack
**Selection reason:** Gold pack attribution / provenance pressure
**Review focus:** Provenance and attribution must not overstate.

> This file shows text a solicitor would see (or an explicit COPY/EXPORT UNAVAILABLE banner).
> Blocked output is containment — **not** substantive repair.
> Human judgments belong in `human-judgment-workbook.json` only.

## Case header (solicitor view)

- Surface id: `case_header`
- Gate status: `display`
- canCopy: `true`

```text
Client: Liam Craft
Allegation: Being concerned in the supply of a controlled drug of Class A, namely cocaine
```

## Court line (copy preview)

- Surface id: `court_line`
- Gate status: `integrity_blocked`
- canCopy: `false`

```text
COPY UNAVAILABLE — Solicitor review required — output integrity check failed.
Underlying court line was gated (blocked ≠ repaired):
The defence asks the court to record per MG6C that message extracts are served and handle attribution report and platform extraction remain outstanding.
```

## Client-safe summary preview

- Surface id: `client_summary`
- Gate status: `display`
- canCopy: `true`

```text
CLIENT-SAFE SUMMARY
(not for court or CPS)

We are reviewing the papers in your case (Liam Craft). This is early-stage — nothing is final until we have full disclosure and your instructions. Message extracts are on the papers, but the handle attribution report, platform/source extraction, and subscriber continuity material are still outstanding. The extracts alone do not prove your role or identity on the account.

[CaseBrain — client-safe summary. Evidence state: provisional. Not for court or CPS use.]
```

## CPS chase — Platform / source extraction

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide Platform / source extraction (see MG6C/ENC/02) or confirm in writing why it is not available.
```

## CPS chase — Handle attribution report

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide Handle attribution report (see MG6C/ENC/03) or confirm in writing why it is not available.
```

## CPS chase — Subscriber / account data

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide Subscriber / account data (see MG6C/ENC/04) or confirm in writing why it is not available.
```

## CPS chase — Device continuity

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide Device continuity (see MG6C/ENC/05) or confirm in writing why it is not available.
```

## Evidence truth map (Overview)

- Surface id: `truth_map`
- Gate status: `display`
- canCopy: `true`

```text
• Encro message extracts LC/MSG/01 — served
• Platform / source extraction — referred_only
• Handle attribution report — missing
• Subscriber / account data — missing
• Device continuity — missing
• co-defendant material — missing
```

## Do-not-overstate warnings

- Surface id: `do_not_overstate`
- Gate status: `warning`
- canCopy: `false`

```text
• handle proves defendant
• NIGHTLINE-77 is Liam Craft
• phone proves role
• Do not treat handle or phone reference as proof of the defendant role without served attribution.
```
