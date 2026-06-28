# H4 Build Order — Real-World Confidence

**Prerequisite:** H3 complete ✅ (chunks 1–3 prod, trust gates clean).

**Do not touch:** Brain 1, frozen cores.

---

## Build sequence

| Step | Work | Status |
|------|------|--------|
| 1 | Apply trust feedback DB migration (`20260628120000_trust_feedback.sql`) | ✅ Applied + verified |
| 2 | Export/copy gate — Chase, Summary, court note, gap list | ✅ `scripts/h4-export-copy-gate.ts` — golden 102 PASS |
| 3 | Fresh-account smoke every deploy (CB-FRESH) | ✅ ongoing |
| 4 | Account/permission smoke | Not started |
| 5 | **Criminal Bundle Simulator Library** — manifest v1 (30 cases) | Spec: `H4_SIMULATOR_LIBRARY.md` |
| 6 | Simulator pack v1 — generate + run 30 fake bundles | Not started |
| 7 | Expand simulator: 30 → 75 → 150+ | Later |
| 8 | Worst50 + simulator failures → Bad Output Memory | Later |

### Step 1 verification

```powershell
npx tsx scripts/apply-trust-feedback-migration.ts   # if re-applying on new env
npx tsx scripts/trust-feedback-persistence-verify.ts
```

### Step 2 gate

```powershell
npx tsx scripts/h4-export-copy-gate.ts
```

Report: `artifacts/casebrain-qa/h4-export-copy/export-copy-report.json`

---

## Scale gates (run with every H4 milestone)

- Golden 102 — 0 dangerous fail
- Level 1 2,200 — 0 dangerous critical
- H3 golden trust — 0 blocking
- H4 export/copy — 0 blocking
- Simulator pack — 0 dangerous fail (when pack exists)
- Worst50 — no repeated dangerous cluster

Taylor/Jordan = deploy smoke only, not primary proof.

---

## Key docs

- `docs/h4/H4_SIMULATOR_LIBRARY.md` — simulator principle, coverage matrices, truth key, gates
- `docs/h4/H4_RED_TEAM_MANIFEST_DRAFT.md` — 30-case v1 seed list
- `docs/h4/H4_EXPORT_COPY_TEST_MATRIX.md` — export/copy checks
