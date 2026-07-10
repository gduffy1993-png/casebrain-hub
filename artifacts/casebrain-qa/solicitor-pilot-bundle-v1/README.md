# Solicitor pilot bundle v1

**Audience:** criminal solicitors / firm leads reviewing CaseBrain for a supervised pilot  
**Branch:** `feature/gold-manual-proof-set-v1`  
**Trust pack baseline:** `b254e1316`  
**Status:** controlled fictional gold ready for supervised review · **not** solicitor-validated real-world performance

---

## What this bundle is

A **reviewer-facing** starter pack for the first solicitor look at CaseBrain.

It points you at:

- Waves A+B gold cases (seven controlled fictional / PDF-backed packets)
- Short trust / safety / offer summaries
- A feedback form and copy-paste email
- References to the pilot-readiness report and trust pack

It does **not** include bulky source folders, internal QA junk, or live client data.

---

## Who should review it

| Role | Why |
|------|-----|
| Criminal solicitor / partner | Judge whether Waves A+B are useful as a supervised pre-court aid |
| Firm compliance / IT (optional) | Skim trust & safety summary; full trust pack if needed |
| CaseBrain pilot operator | Hand this zip to the firm; collect forms |

---

## What to open first

1. **[PILOT-START-HERE.md](./PILOT-START-HERE.md)** — 10- or 30-minute path  
2. **[WAVE-A-B-CASE-INDEX.md](./WAVE-A-B-CASE-INDEX.md)** — pick cases  
3. Case packet under `cases/CASE-XX/` (`CASE-REVIEW.md` + checklist)  
4. **[REVIEWER-FEEDBACK-FORM.md](./REVIEWER-FEEDBACK-FORM.md)** — one per case (or sample)  
5. Optional: [TRUST-AND-SAFETY-SUMMARY.md](./TRUST-AND-SAFETY-SUMMARY.md) · [PILOT-OFFER-SUMMARY.md](./PILOT-OFFER-SUMMARY.md)

Full trust pack detail (if you have the repo): `docs/pilot-trust-pack/`.  
In this zip: short summary above + `references/TRUST-PACK-INDEX.md`.

---

## Claim discipline

**Can say:** controlled fictional proof done; gold pack 20/0/0 hard safety 0; Waves A+B PASS; supervised review aid for served / referred / missing / unsafe-to-say traps.

**Cannot say:** solicitor-validated on live files; legal advice replacement; autonomous court/CPS sending; guaranteed accuracy; SOC 2 / ISO / pen-test / SRA approval.

Safe line:

> Controlled fictional proof is complete. This bundle is for a supervised gold review. Redacted firm matters come later, under written kick-off. Not legal advice.

---

## Bundle contents

| Path | Purpose |
|------|---------|
| [PILOT-START-HERE.md](./PILOT-START-HERE.md) | Timed review paths |
| [WAVE-A-B-CASE-INDEX.md](./WAVE-A-B-CASE-INDEX.md) | Seven-case index |
| [REVIEWER-FEEDBACK-FORM.md](./REVIEWER-FEEDBACK-FORM.md) | Pass / warn / fail form |
| [TRUST-AND-SAFETY-SUMMARY.md](./TRUST-AND-SAFETY-SUMMARY.md) | Short trust pack |
| [PILOT-OFFER-SUMMARY.md](./PILOT-OFFER-SUMMARY.md) | 30-day offer snapshot |
| [COPY-PASTE-EMAIL.md](./COPY-PASTE-EMAIL.md) | Outreach email |
| [PATHS-AND-REFERENCES.md](./PATHS-AND-REFERENCES.md) | Clean zip + report paths |
| [SEND-READINESS-CHECK.md](./SEND-READINESS-CHECK.md) | Pre-send review verdict |
| `cases/` | Waves A+B review packets (no `_source`) |
| `references/` | Readiness, Waves A+B summary, trust index/review |

Machine gold pack (full 20, in repo): `artifacts/casebrain-qa/gold-manual-proof-set-v1/` — **20 pass / 0 warn / 0 fail**.  
Zip-only reviewers: Waves A+B in `cases/` is enough for the first look.
