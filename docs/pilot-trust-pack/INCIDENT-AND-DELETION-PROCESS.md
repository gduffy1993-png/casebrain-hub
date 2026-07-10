# Incident and deletion process

**Audience:** pilot firm lead + CaseBrain pilot operator  
**Goal:** Clear steps for deletion requests and security incidents — without over-claiming certifications

---

## A. Deletion request process

### Who can request

- Firm pilot lead (or named compliance contact)  
- CaseBrain may also delete at pilot end per agreement

### How to request

1. Email / written request to the CaseBrain pilot operator.  
2. Include: workspace / firm name, matter IDs or titles, whether **all pilot data** or **specific matters**, and confirmation that exports held by the firm will be handled on the firm side.  
3. CaseBrain confirms receipt within **1 business day** (or next agreed SLA).

### What CaseBrain does

1. Disable access to listed matters if still open.  
2. Delete uploaded files and case records for those matters from the live workspace.  
3. Note backup / replica lag and expected expiry window.  
4. Confirm completion in writing (what was deleted; what may remain briefly in backups).  
5. Record the request in the pilot log.

### What the firm should do

- Delete local downloads / email forwards of pilot outputs they no longer need.  
- Confirm no further uploads for deleted matters.

Gold fictional packets owned by CaseBrain are not “firm client data”; they may remain in CaseBrain eval artifacts unless the request is specifically about a firm workspace copy.

---

## B. Incident response steps

An **incident** includes: suspected unauthorised access, data sent to the wrong party, malware on a pilot device affecting CaseBrain access, or accidental upload of unredacted sensitive material.

1. **Contain** — revoke/reset affected credentials; isolate the matter; stop further sharing.  
2. **Notify** — firm lead + CaseBrain pilot operator same day.  
3. **Assess** — what data, which users, which systems, time window.  
4. **Preserve evidence** — relevant logs, timestamps, matter IDs (do not destroy evidence needed for the review).  
5. **Remediate** — delete or quarantine bad uploads; rotate secrets; patch process gaps.  
6. **Write-up** — short incident note: facts, impact, actions, follow-ups.  
7. **Follow-up** — access review; whether regulators/clients need firm-side notification (firm decides with its own counsel).

CaseBrain does not claim a certified incident-response accreditation in this pack; this is the operational pilot process.

---

## C. Access review

After an incident or on request at pilot end:

- List users with access to the pilot workspace  
- Confirm leavers removed  
- Review recent admin / support access logs if available  
- Confirm matter list still matches the agreed cap  

---

## D. Who is notified

| Event | Notify |
|-------|--------|
| Deletion request | Pilot operator ↔ firm lead |
| Suspected breach / wrong disclosure | Firm lead + CaseBrain operator immediately; escalate inside firm as firm policy requires |
| Hard safety FAIL on a matter | Pilot operator + product owner; pause promotion of that pattern |

External regulator or client notification is a **firm** decision unless law requires CaseBrain action.

---

## E. What logs are checked

As available for the environment:

- Authentication / sign-in  
- Matter upload / delete  
- Admin or support access  
- Recent export or share actions (if instrumented)

If a log type is not available, say so honestly in the incident note.

---

## F. What evidence is preserved

Until the incident is closed:

- Incident timeline  
- Matter IDs and file names (not more content than needed)  
- Access logs relied on  
- Decisions and deletion confirmations  

Do not keep unnecessary copies of full unredacted bundles “just in case” after the firm has requested deletion — preserve only what the investigation still needs, then delete under section A.

---

## Contacts (fill at kick-off)

| Role | Name | Contact |
|------|------|---------|
| Firm pilot lead | | |
| Firm IT / compliance | | |
| CaseBrain pilot operator | | |
| CaseBrain escalation | | |
