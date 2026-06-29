# Evidence-State Reviewer Guide

> **For criminal defence solicitors and experienced caseworkers.**  
> **Solicitor-reviewed audit has not yet run.** This guide prepares independent marking.  
> **Controlled/synthetic audit (253 cases) exists separately — not a substitute for this review.**

---

## Your role

You are marking **what the disclosure bundle actually supports** — not what you hope to obtain, not what the MG5 asserts without source, and not what CaseBrain already says.

Mark each item with an **evidence state** and short notes. If you are unsure, say so in `reviewer_confidence` and `reviewer_notes`.

---

## Evidence states (definitions)

### served

The material is **on the bundle** as a usable document or extract the defence can open and read (statement, clip with substance, schedule with content, charge sheet, etc.).

- Does **not** mean “reliable” or “proves the case”.
- A served MG11 may still be unsigned, inconsistent, or partial — see **incomplete** if appropriate.

### referred_only

The bundle **mentions** the material (MG6 schedule, MG5 summary, index, letter) but the **underlying export/recording/download is not served**.

- “Referred on MG6 — export not served” → **referred_only**
- BWV listed in index without file → **referred_only** (or **missing** if clearly outstanding)

### missing

Material that **should be on the bundle** for the current stage but is **absent** — not merely referred.

- Full custody record when only an extract appears elsewhere
- VIPER pack not served when ID is live
- Lab report outstanding with no summary on bundle

### incomplete

Something is served but **not the full/source version** needed for fair assessment.

- Short BWV clip or stills without full window/export
- Interview **summary** without recording/transcript
- Phone **screenshots** without full download, metadata, or search scope
- Medical **summary** without report/imaging
- Partial CCTV timeline when master footage is required

### not_safely_confirmed

The papers are too thin, ambiguous, or contradictory to treat the item as any clearer state without further disclosure or review.

- Index lists “CCTV” but no file and unclear if referred or forgotten
- OCR-garbled schedule lines
- “Available on request” with no clarity on status

### inferred_only

The bundle invites a **conclusion** (attribution, intent, role, sender identity) but does **not** serve primary proof.

- MG5 says “phone attributed to defendant” but no subscriber/download
- Encro handle named but no mapping certificate
- “Defendant was driver” in summary without ID or admission source

### other_defendant_only

Material relates to a **co-defendant or other person** — not safely attributable to **your** client.

- Co-defendant interview summary on MG6C
- Co-defendant chat export
- Another defendant’s phone download in a multi-handed case

Mark **do not import** to client case theory. Chase may still be relevant for context/segregation.

---

## Worked examples

| Situation | Mark as |
|-----------|---------|
| BWV mentioned in MG5 but no file on bundle | **referred_only** |
| Short BWV transcript on bundle; full download outstanding | **incomplete** (+ chase full BWV) |
| Phone screenshots served; no UFED/download/metadata | **incomplete** (screenshots served) + **missing** (full download) as separate items if helpful |
| Index lists CCTV; no file; MG6 says “to follow” | **referred_only** or **not_safely_confirmed** |
| Index lists CCTV; no file; no MG6 line | **missing** or **not_safely_confirmed** |
| Co-defendant WhatsApp export on MG6C | **other_defendant_only** |
| MG5 attributes Encro handle; no extraction/mapping served | **inferred_only** (attribution) |
| Signed complainant MG11 on bundle | **served** (reliability separate) |
| Unsigned MG11 draft | **incomplete** or **served** with reliability note — explain in notes |
| Custody extract fragment; full PACE record missing | **incomplete** (extract) + **missing** (full record) |
| Amended indictment served with old count pages | **served** with **source_hierarchy_note** — map to live counts |

---

## Defendant relevance

| Value | When to use |
|-------|-------------|
| `primary_defendant` | Item relates to your client’s case theory or disclosure obligation |
| `co_defendant_only` | Co-accused material — segregate |
| `complainant_witness` | Complainant/witness account (not defendant material) |
| `other` | Third party, officer, unknown |
| `unclear` | Attribution not safe — say why |

---

## Chase, rely, send

- **chase_needed** — should defence still chase this? (yes/no)
- **expected_chase_item** — short label for chase list if chased
- **safe_to_rely_on** — can a solicitor rely on this item for **tactical** assessment? (not “safe to send to client”)
- **safe_to_send** — may this item support **client summary / CPS chase / court line** as currently served? Usually **no** for referred, missing, incomplete, inferred, co-def-only

---

## Must-not-say lines

List short phrases CaseBrain must **not** state as fact, e.g.:

- “BWV shows the assault”
- “Phone proves dealing”
- “Co-defendant’s messages prove client’s role”

---

## Source hierarchy

If MG5 summary conflicts with MG11, or officer summary conflicts with exhibit, note in **source_hierarchy_note**. Primary source (MG11, recording, download) outranks summary unless missing.

---

## Confidence

| Level | Meaning |
|-------|---------|
| `high` | Clear on bundle face |
| `medium` | Reasonable inference from papers |
| `low` | Thin/OCR/conflict — flag for discussion |
| `disputed` | You disagree with another reviewer or Crown description |

---

## What we are not asking

- Predictions of outcome
- Proof of innocence or guilt
- Editing CaseBrain output
- Access to internal CaseBrain rules or code

---

## Disclaimer

- Controlled CaseBrain audit (253 fictional/anonymised cases, 0 false-served) is **separate** and **not** solicitor-reviewed.
- This review, when run, will **not** automatically prove performance on all live cases.
- All CaseBrain outputs still require professional judgment.
