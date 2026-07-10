# Security and data handling

**Audience:** firm IT / compliance / partners considering a pilot  
**Tone:** plain English; operational description — **not** a certification claim  
**Important:** This document does **not** claim SOC 2, ISO 27001, pen-test completion, or SRA approval.

---

## Purpose

Describe how CaseBrain is intended to handle pilot and production workspace data so a firm can decide whether a supervised pilot is acceptable.

Final vendor / subprocessor confirmation is required **before** live client data — see `SUBPROCESSORS-AND-AI-PROCESSING.md`.

---

## Firm / workspace isolation

- Cases and documents sit in a **firm (organisation) workspace**.  
- Users should only see matters for their own workspace.  
- Access is gated by authentication and organisation membership.  
- Pilot workspaces can be limited to named users and a capped matter list.

Firms should not share login credentials across people outside the agreed pilot set.

---

## Encryption

| Path | Practice |
|------|----------|
| In transit | HTTPS / TLS for app and API traffic |
| At rest | Database and object storage use provider-managed encryption at rest (hosting platform defaults) |

Exact hosting region and provider names for a live pilot must be confirmed in writing at kick-off.

---

## Role and access control

- Named user accounts (no shared “office” password for pilot).  
- Role-appropriate access within the firm workspace.  
- Admin / service access is **restricted** and should be **logged** when used for support.  
- CaseBrain staff do not browse client matters by default; support access only when needed for the pilot and with firm awareness where practical.

---

## Audit logging

Operational logs may include:

- Sign-in / authentication events  
- Matter create / upload / delete events (where instrumented)  
- Support / admin access events  

Logs are for security and incident response — not for marketing. Retention of logs should be time-bounded; confirm period at kick-off.

---

## Deletion and retention

- Pilot matters can be deleted on firm request (see `INCIDENT-AND-DELETION-PROCESS.md`).  
- Default pilot retention: keep only for the pilot period + short wind-down unless the firm asks to keep or delete earlier.  
- Backups may lag deletion briefly; deletion requests should note when backup expiry completes.  
- Gold / fictional packets are CaseBrain-controlled test material, not firm client data.

---

## No training on client data

CaseBrain’s pilot position:

- **Do not** use firm client or redacted shadow matter content to train public foundation models.  
- AI features (where used) should run under API / enterprise terms that do **not** permit training on customer content for public models.  
- Controlled fictional eval packs are CaseBrain’s own test material and are separate from firm client data.

If a vendor’s terms change, the pilot must be re-checked before further uploads.

---

## Admin access — restricted and logged

- Production admin / service-role tools are for break-glass support and operations.  
- Use should be limited, purposeful, and logged.  
- Pilot firms may ask what was accessed if an incident or support ticket requires it.

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
