# Trust and safety summary

Short version of `docs/pilot-trust-pack/` for solicitor reviewers.  
**Not a certification.** No SOC 2, ISO 27001, pen-test, or SRA approval claimed.

---

## What is true today

- Controlled fictional proof at scale + gold manual pack **20 pass / 0 warn / 0 fail** (hard safety 0).  
- Waves A+B reviewer-style **PASS**.  
- Offered as a **supervised review aid** — drafts only.

## What is not true yet

- Solicitor-validated performance on live client files  
- Guaranteed accuracy  
- Legal advice replacement  
- Autonomous sending to court / CPS / client  

---

## Pilot order

1. **Gold fictional first** (this bundle — Waves A+B).  
2. **Redacted firm matters** only after written kick-off (users/matters capped; subprocessors + no-training terms confirmed).  
3. Unredacted live client data is **not** the default offer.

---

## Non-negotiables

| Rule | Meaning |
|------|---------|
| No autonomous sending | Nothing goes to court/CPS/client from the tool alone |
| Solicitor sign-off | Read, edit, or discard before any external use |
| No training on client data | Firm uploads not used to train public foundation models; confirm vendor terms before firm upload |
| Deletion | Written request → delete from live workspace; confirm in writing; backup lag **target ≤ 30 days** (host-dependent) |
| Retention default | Pilot period + **14 days** wind-down unless you ask to keep or delete earlier |

---

## Data handling (plain English)

- Firm workspace isolation; named pilot users.  
- HTTPS in transit; provider encryption at rest (confirm host/region at kick-off).  
- Support access to your pilot matters: notify firm lead (break-glass → notify ASAP).  
- Full detail: `references/TRUST-PACK-INDEX.md` (and live `docs/pilot-trust-pack/` if you have the repo).

---

## Safe claim line

> Controlled fictional proof is done. Supervised gold review is next. Redacted shadow pilot only after kick-off. Not legal advice. Not solicitor-validated real-world performance.
