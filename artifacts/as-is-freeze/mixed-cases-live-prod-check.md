# Mixed realistic cases — live production vs file

**Call:** mixed medium files, not a 150-page Malik-Price dump. Four families on live, seven on the new mouth.

Base: https://www.casebrain.co.uk  
Account used: `demo.loom.taylor.1782877263@casebrain.qa.smoke`  
Fresh account: **blocked**. Signup rejected `mixed.live.*@casebrain.qa.smoke` as an invalid email. This VM has no inbox and no Supabase admin key, so a brand-new confirmed pro user cannot be created here.

Production still has the **old mouth**. No **On the file** strip on any tab.

## Live score (charge / court / no family bleed)

| Case | Charge | Court | Hearing | Leak | On the file | Verdict | Case id |
|---|---|---|---|---|---|---|---|
| Jordan Hale (AEW) | MATCH | MATCH | MISS — used offence date 12 Mar 2026, file lists PTPH 22 Jul 2026 | clean | no | PASS | f73db13e-4d47-4e8f-a17a-dedf8deebee7 |
| Amara Okafor (Class B possession) | MATCH | MATCH Northgate | MATCH 3 Oct 2026 | clean — not PWITS | no | PASS | 275f13af-ceb2-4cc9-aa91-7330abed626a |
| Daniel Clarke (drink-drive) | MISS — “Charge not on papers” | MISS | MISS | clean | no | FAIL | d067ec1e-cb71-4185-9d9c-b6903970845e |
| Ashleigh Merritt (theft) | MATCH s.1 Theft Act 1968 | MATCH Northshire | MATCH 14 May 2024 | clean | no | PASS | b08e6ec6-e75a-4a74-a399-13e01cbd2ae7 |

**Score:** 3/4 PASS on charge/court. Clarke is the miss.

## What the live app actually did

- **Jordan:** charge and court right. Hearing picked the 12 March assault date, not the 22 July PTPH line. Same “wrong date from the file” shape as before. Offence family not safely mapped — Proof / Advanced stay blocked even though the charge is sitting on the card.
- **Okafor:** Class B possession, not supply. Court and listing match the file. Phone/interview chase warnings stay generic.
- **Clarke:** local PDF extract is 3,110 characters and has the Road Traffic Act charge on page 1. Live bundle health said **thin pack — 233 chars**. So the extractor barely read it, then fail-closed (name/charge/court/hearing all “not safely extracted”). Incomplete, not a hallucinated GBH. Still a miss — the charge is on the file.
- **Merritt:** theft wording and court match. Header smashes “Theft” next to the court name (`Theft Northshire Magistrates' Court`). Integrity still blocks Proof / Advanced.

No case invented PWITS, GBH, or a second family.

## New mouth on the same files (not live)

`npx tsx scripts/mixed-cases-fact-record-check.ts` — **7/7 PASS**, including Clarke (Motoring, 12 Sept 2026) and Priya Nguyen (s.39 common assault → Violence). Counts stay unknown without a matter VM.

That mouth is on `cursor/solicitor-fact-record-c0ed`. It is **not** on production yet.

## Screenshots

- `artifacts/as-is-freeze/mixed-live-prod/00-signup.png` — fresh email rejected
- `…/jordan-aew-overview.png`
- `…/okafor-drugs-overview.png`
- `…/clarke-motoring-overview.png`
- `…/merritt-theft-overview.png`
