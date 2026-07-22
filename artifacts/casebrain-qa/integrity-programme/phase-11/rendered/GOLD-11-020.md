# GOLD-11-020 — solicitor-visible render

**Stratum:** composed_prose
**Fixture:** CASE-02:demo-audit-03-bwv-custody
**Source kind:** gold_manual_pack
**Selection reason:** Gold pack BWV/custody composed surfaces
**Review focus:** Client/court composed lines word-for-word.

> This file shows text a solicitor would see (or an explicit COPY/EXPORT UNAVAILABLE banner).
> Blocked output is containment — **not** substantive repair.
> Human judgments belong in `human-judgment-workbook.json` only.

## Case header (solicitor view)

- Surface id: `case_header`
- Gate status: `display`
- canCopy: `true`

```text
Client: Casey Fry
Allegation: Assault an emergency worker, contrary to section 1 of the Assaults on Emergency Workers (Offences) Act 2018
```

## Court line (copy preview)

- Surface id: `court_line`
- Gate status: `integrity_blocked`
- canCopy: `false`

```text
COPY UNAVAILABLE — Solicitor review required — output integrity check failed.
Underlying court line was gated (blocked ≠ repaired):
The defence asks the court to record per MG6C that custody extract is served, BWV is referred only, and full custody record and interview material remain outstanding.
```

## Client-safe summary preview

- Surface id: `client_summary`
- Gate status: `display`
- canCopy: `true`

```text
CLIENT-SAFE SUMMARY
(not for court or CPS)

We are reviewing the papers in your case (Casey Fry). This is early-stage — nothing is final until we have full disclosure and your instructions. A custody record extract is on the papers, but the full body-worn video export, complete custody record, and interview/PACE material are still outstanding.

[CaseBrain — client-safe summary. Evidence state: provisional. Not for court or CPS use.]
```

## CPS chase — Full BWV export

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide Full BWV export (see MG6C/010) or confirm in writing why it is not available.
```

## CPS chase — Full custody record

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide Full custody record (see MG6C/011) or confirm in writing why it is not available.
```

## CPS chase — Interview audio / transcript

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide Interview audio / transcript (see MG6C/013) or confirm in writing why it is not available.
```

## Evidence truth map (Overview)

- Surface id: `truth_map`
- Gate status: `display`
- canCopy: `true`

```text
• Body-worn video (BWV) — referred_only
• Officer statement — served
• Custody record extract — served
• Full custody record — missing
• Interview audio — missing
• Interview transcript — missing
• PACE safeguards detail — missing
```

## Do-not-overstate warnings

- Surface id: `do_not_overstate`
- Gate status: `warning`
- canCopy: `false`

```text
• BWV shows
• BWV confirms
• PACE safeguards were followed
• Do not rely on full BWV sequence unless export is served.
• Assumed position may conflict with interview or served evidence.
• Do not state "interview confirms" — Interview material is not fully served
```
