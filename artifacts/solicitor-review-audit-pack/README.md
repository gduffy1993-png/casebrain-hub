# Solicitor-Reviewed Evidence-State Audit — Preparation Pack

> **This pack prepares independent solicitor/caseworker review. The solicitor-reviewed audit has not yet run.**

> **A separate controlled/synthetic audit (253 cases, 2,010 evidence items, 0 false-served, 0 blocking failures) already exists. That is not solicitor-reviewed real-world proof.**

---

## What this pack is

Materials for the **next proof layer**: a practising criminal defence solicitor or experienced caseworker reviews anonymised bundles and marks **truth keys** — what each piece of evidence actually is (served, referred, missing, incomplete, etc.) and what CaseBrain must **not** treat as proved.

CaseBrain will later be scored against those independent truth keys. No product changes are required to use this pack.

---

## How review works

1. **Receive** an anonymised bundle (PDF or text export) and a blank truth key (`TRUTH_KEY_TEMPLATE.json` or `REVIEW_FORM.md`).
2. **Read** `REVIEWER_GUIDE.md` for evidence-state definitions and examples.
3. **Mark** each evidence item: state, defendant relevance, chase need, safe-to-rely, must-not-say lines.
4. **Complete** `REVIEW_FORM.md` (or structured JSON) and note confidence / disagreements.
5. **Return** the truth key to the CaseBrain team — **not** uploaded to production systems unless explicitly authorised.

CaseBrain engineers run the existing evidence-state audit harness against the bundle output and compare to the solicitor truth key. Scoring uses `SCORING_TEMPLATE.md`.

---

## What the reviewer is marking

For each evidence item the reviewer decides:

- **Evidence state** — served, referred_only, missing, incomplete, not_safely_confirmed, inferred_only, other_defendant_only
- **Defendant relevance** — primary defendant, co-defendant only, other party, unclear
- **Chase need** — whether disclosure should still be chased
- **Safe to rely / safe to send** — whether the item supports client/CPS/court copy yet
- **Must not say** — lines CaseBrain must not state as fact from this item

Truth keys are **independent** of CaseBrain. The reviewer should mark what the **papers** show, not what CaseBrain currently outputs.

---

## Why truth keys matter

Without independent truth keys, automated audits only test against our own expectations. Solicitor-reviewed keys test whether CaseBrain’s evidence-state labelling matches how a defence lawyer reads the bundle — the standard that matters in practice.

---

## How CaseBrain will be scored

Metrics include false-served rate, state accuracy by category, wrong-defendant bleed, chase accuracy, export surface safety, and over-cautious rate. See `SCORING_TEMPLATE.md`.

**No real-world false-served claim** may be made until this review completes on an agreed case set.

---

## What not to include in submissions

- Real client names, addresses, URNs, or identifiable court references (unless under written firm authorisation and secure channel)
- Unredacted victim/child/sexual offence material beyond what the review requires
- Production credentials, API keys, or internal CaseBrain rule dumps
- Assumptions about guilt, outcome, or “what the Crown will do”

---

## Confidentiality and anonymisation

All bundles for this audit must pass `ANONYMISATION_CHECKLIST.md` before sharing with reviewers or storing in this folder.

**Do not upload real client data** unless your firm has explicitly authorised the audit and a secure handling process is in place.

---

## Controlled audit (already done — separate)

| Controlled audit (synthetic/fictional) | Solicitor-reviewed audit (this pack) |
|----------------------------------------|--------------------------------------|
| 253 runnable cases | Not yet run |
| 2,010 evidence items | Target: 30–50 cases first |
| 0 false-served / 0 blocking | Independent truth keys |
| Not real-world proof | Aims at real-world read accuracy |

---

## Pack contents

| File | Purpose |
|------|---------|
| `README.md` | This overview |
| `REVIEWER_GUIDE.md` | Plain English evidence-state guide |
| `TRUTH_KEY_TEMPLATE.json` | Machine-readable template |
| `REVIEW_FORM.md` | Human-friendly review form |
| `ANONYMISATION_CHECKLIST.md` | Redaction and safety checklist |
| `SCORING_TEMPLATE.md` | How CaseBrain will be scored |
| `COVERAGE_TARGETS.md` | Diversity and coverage requirements |
| `SAMPLE_TRUTH_KEY.json` | Fictional worked example |
| `NEXT_STEPS.md` | Staged rollout plan |

---

## Sharing

Safe to share this **preparation pack** with a solicitor reviewer under confidentiality. Do **not** share internal harness code, full simulator trees, or unanonymised bundles.

Every external statement must distinguish:

- **Controlled audit** (done, synthetic) — not solicitor-reviewed real-world audit  
- **Solicitor-reviewed audit** (prepared here, not yet run)
