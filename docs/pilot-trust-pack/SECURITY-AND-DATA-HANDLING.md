# Security and data handling

**Audience:** firm IT / compliance / partners considering a pilot  
**Tone:** plain English; operational description — **not** a certification claim  
**Important:** This document does **not** claim SOC 2, ISO 27001, pen-test completion, or SRA approval.

---

## Purpose

Describe how CaseBrain is intended to handle **pilot workspace** data so a firm can decide whether a supervised pilot is acceptable. This is an operational description for the pilot — not a production certification pack.

Final vendor / subprocessor confirmation is required **before any firm-uploaded matter** (including redacted shadows) — see `SUBPROCESSORS-AND-AI-PROCESSING.md`. A gold-only review using CaseBrain’s own fictional packets can start earlier.

---

## Firm / workspace isolation

- Cases and documents sit in a **firm (organisation) workspace**.  
- Users should only see matters for their own workspace.  
- Access is gated by authentication and organisation membership.  
- Pilot workspaces are limited to **named users** and a **capped matter list** agreed at kick-off.

Firms should not share login credentials across people outside the agreed pilot set.

---

## Encryption

| Path | Practice |
|------|----------|
| In transit | HTTPS / TLS for app and API traffic |
| At rest | Database and object storage use the hosting provider’s encryption at rest |

**Confirm in writing at kick-off:** hosting provider name(s) and region(s). Do not treat “encryption” as a substitute for SOC 2 / ISO claims (none made here).

---

## Role and access control

- Named user accounts (no shared “office” password for pilot).  
- Role-appropriate access within the firm workspace.  
- Admin / service access is **restricted** and **logged** when used for support.  
- CaseBrain staff do not browse firm pilot matters by default.

**Support access rule:** if CaseBrain support needs to open a firm’s pilot matter, **notify the firm lead** first when practicable; if break-glass access is required, notify the firm lead **as soon as practicable** the same day and record what was accessed.

---

## Audit logging

Honest baseline: **not every action is guaranteed to be logged.**

At kick-off, CaseBrain confirms which of the following are available in the pilot environment:

- Sign-in / authentication events  
- Matter create / upload / delete events  
- Support / admin access events  

Logs are for security and incident response — not for marketing. Confirm log retention period at kick-off (time-bounded).

---

## Deletion and retention

- Pilot matters can be deleted on firm request (see `INCIDENT-AND-DELETION-PROCESS.md`).  
- **Default retention:** pilot period + **14 days** wind-down, unless the firm asks to keep or delete earlier.  
- **Backup lag:** after live deletion, copies may remain in provider backups for a short period — **operational target ≤ 30 days** (host-dependent; confirm at kick-off; not a legal guarantee).  
- Deletion confirmations state what was removed from the live workspace and the expected backup expiry window.  
- Gold / fictional packets are CaseBrain-controlled test material, not firm client data.

---

## No training on client data

**Pilot policy:**

- Do **not** use firm client or redacted shadow matter content to train public foundation models.  
- Do **not** upload firm matters until AI vendor / API terms that **exclude training on customer content** are confirmed in writing for the vendors in use.  
- Controlled fictional eval packs are CaseBrain’s own test material and are separate from firm uploads.  
- Anonymised solicitor **feedback form themes** (tick-boxes / short notes) may be used to improve the product process; that is not the same as training models on uploaded bundle text.

If a vendor’s terms change, pause firm uploads and re-confirm before continuing.

---

## Admin access — restricted and logged

- Admin / service-role tools are for break-glass support and operations.  
- Use must be limited, purposeful, and logged.  
- On request after support access or an incident, CaseBrain tells the firm lead **what was accessed and when** (as far as logs allow).

---

## Redacted bundle option (preferred for shadow pilot)

Before any real-matter upload:

1. Firm redacts names, addresses, DOBs, unique IDs, and other identifiers as agreed.  
2. Prefer fictional gold packets first.  
3. Upload only what is needed for the review (data minimisation).  
4. Label the matter as **redacted shadow — pilot**.  

See `REDACTED-SHADOW-PILOT-PROCESS.md`.

---

## What this section does not claim

- Independent audit certification  
- Guaranteed immunity from breach  
- That every historical log line exists for every action  

Security is a continuous practice. Report concerns under `INCIDENT-AND-DELETION-PROCESS.md`.
