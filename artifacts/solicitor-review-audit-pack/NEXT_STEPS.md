# Next Steps — Solicitor-Reviewed Audit

> **Solicitor-reviewed audit has not yet run.**  
> **Controlled/synthetic audit (253 cases, 2,010 items, 0 false-served, 0 blocking) is complete separately.**

---

## Stage plan

| Stage | Scope | Goal |
|-------|-------|------|
| **0 — Preparation** | This pack | Reviewer guide, forms, templates, coverage targets |
| **1 — Pilot** | **30–50** solicitor/caseworker-reviewed cases | Independent truth keys; first honest false-served / bleed metrics |
| **2 — Remediation** | As needed | Fix dangerous presentation/audit issues surfaced in Stage 1 — **no core Brain rewrite without approval** |
| **3 — Expand** | **100** reviewed cases | Broader offence/layout coverage if Stage 1 gates pass |
| **4 — Scale** | **250–300** reviewed cases | Stronger real-world read claim **only if** metrics and methodology support it |
| **5 — Claims** | External | Disciplined statements with scope footnotes |

Do **not** skip Stage 1 or claim industry proof early.

---

## Stage 1 pilot — practical sequence

1. Select bundles per `COVERAGE_TARGETS.md` (diverse, not repetitive).  
2. Anonymise per `ANONYMISATION_CHECKLIST.md`.  
3. Distribute `REVIEWER_GUIDE.md` + `REVIEW_FORM.md` (or JSON template).  
4. Collect completed truth keys.  
5. Run CaseBrain on same bundles (existing H5 builders).  
6. Score per `SCORING_TEMPLATE.md`.  
7. Publish **internal** pilot report with full disclaimer.  
8. Decide: remediate vs expand to 100.

---

## Gate questions after pilot

- **false_served_count** — any confirmed dangerous cases?  
- **wrong_defendant_bleed** — any on chase/client/court surfaces?  
- **export_surface_safety** — CPS/court/client failures?  
- **Reviewer confidence** — too many low/disputed marks?  
- **Duplicates** — did any bundles fail diversity rules?  

If gates fail: **fix before expanding case count**.

---

## Claims discipline

### May say now

- Controlled audit on **253 fictional/anonymised** cases: **0 false-served**, **0 blocking** (see `artifacts/casebrain-proof/controlled-evidence-state-audit-summary.md`).  
- Solicitor-reviewed audit **preparation pack** exists.  
- Next layer is **independent solicitor review** (not yet run).

### May say after Stage 1 (if true)

- “On [N] solicitor-reviewed **anonymised** cases, we measured [metrics] using [method].”

### May not say until appropriately completed

- Near-zero false-served on **all** real-world bundles  
- Solicitor-reviewed audit “complete” at industry scale  
- Real-world proof equivalent to controlled 253-case result  

### Every report must include

- Controlled audit exists **separately** (synthetic/fictional)  
- Solicitor-reviewed audit scope, case count, and limits  
- Outputs require **solicitor review** in practice  

---

## What we are not doing in this stage

- Running the solicitor audit yet  
- Using real client data in the sample pack  
- Building new product UI  
- Changing Brain 1, Guardian, battleboard, contradiction, chase, or classification core  
- Exposing proprietary internals to reviewers  

---

## Folder layout (when cases are added)

```
artifacts/solicitor-review-audit-pack/
├── README.md
├── … (guides and templates)
└── cases/                    # future — one folder per reviewed case
    └── SOL-REVIEW-XXX/
        ├── bundle-anonymised.pdf   # or .md — authorised only
        ├── truth-key.json          # solicitor completed
        └── review-form.md          # optional human copy
```

**Do not** commit real client bundles to the repository without explicit governance.

---

## Contact / governance (fill in)

| Role | Responsibility |
|------|----------------|
| Audit owner | Case selection, scoring, reporting |
| Reviewer lead | Solicitor/caseworker coordination |
| Data protection | Anonymisation sign-off |

---

*Controlled proof is strong. Independent solicitor-reviewed proof is the intended next layer — not yet started.*
