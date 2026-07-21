# GOLD-11-018 — solicitor-visible render

**Stratum:** composed_prose
**Fixture:** CASE-04:demo-audit-02-cctv-stills
**Source kind:** gold_manual_pack
**Selection reason:** Gold pack CCTV stills composed court/client lines
**Review focus:** Composed prose acceptability word-for-word.

> This file shows text a solicitor would see (or an explicit COPY/EXPORT UNAVAILABLE banner).
> Blocked output is containment — **not** substantive repair.
> Human judgments belong in `human-judgment-workbook.json` only.

## Case header (solicitor view)

- Surface id: `case_header`
- Gate status: `display`
- canCopy: `true`

```text
Client: Devon Walsh
Allegation: Theft from a shop, contrary to section 1(1) and 7(1) of the Theft Act 1968
```

## Court line (copy preview)

- Surface id: `court_line`
- Gate status: `ok`
- canCopy: `true`

```text
The defence asks the court to record per MG6C that CCTV still images are served but master CCTV footage, full export, and continuity/provenance remain outstanding.
```

## Client-safe summary preview

- Surface id: `client_summary`
- Gate status: `display`
- canCopy: `true`

```text
CLIENT-SAFE SUMMARY
(not for court or CPS)

We are reviewing the papers in your case (Devon Walsh). This is early-stage — nothing is final until we have full disclosure and your instructions. CCTV still images are on the papers, but the master CCTV footage, full export, and continuity/provenance material are still outstanding. Stills alone do not show the full recording.

[CaseBrain — client-safe summary. Evidence state: provisional. Not for court or CPS use.]
```

## CPS chase — Master CCTV footage

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide Master CCTV footage (see MG6C/CCTV/02) or confirm in writing why it is not available.
```

## CPS chase — Full CCTV export

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide Full CCTV export (see MG6C/CCTV/03) or confirm in writing why it is not available.
```

## CPS chase — CCTV Continuity / provenance

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide CCTV Continuity / provenance (see MG6C/CCTV/04) or confirm in writing why it is not available.
```

## CPS chase — CCTV audit trail / source hash

- Surface id: `cps_chase_draft`
- Gate status: `display`
- canCopy: `true`

```text
Please provide CCTV audit trail / source hash (see MG6C/CCTV/05) or confirm in writing why it is not available.
```

## Evidence truth map (Overview)

- Surface id: `truth_map`
- Gate status: `display`
- canCopy: `true`

```text
• CCTV still images — served
• Full CCTV export — referred_only
• Master CCTV footage — missing
• CCTV continuity / provenance — missing
• CCTV audit trail / source hash record — missing
• Recognition / ID basis — missing
```

## Do-not-overstate warnings

- Surface id: `do_not_overstate`
- Gate status: `warning`
- canCopy: `false`

```text
• CCTV proves identity
• CCTV proves offence
• positive identification from stills
• Do not treat stills alone as proof of identity or offence.
• Do not state "Full CCTV confirms" — CCTV is not fully served on papers
```
