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
| 4 | Account/permission smoke | ✅ `scripts/h4-account-permission-smoke.ts` — master preview 25 pass / 0 fail |
| 5 | **Criminal Bundle Simulator Library** — manifest v1 (30 cases) | ✅ `docs/h4/simulator-manifest.v1.json` |
| 6 | Simulator pack v1 — generate + run 30 fake bundles | ✅ `scripts/h4-simulator-pack-v1-generate.ts` · gate 0 blocking |
| 6b | **v1.1 serious-case supplement (+7)** | `sim-031`..`037` — EncroChat, county lines, conspiracy, multi-hand, CCTV robbery, historic sexual, phone download |
| 7 | Expand simulator: 37 → 75 → 150+ | Later |
| 8 | Worst50 + simulator failures → Bad Output Memory | Later |

### Step 1 verification

```powershell
npx tsx scripts/apply-trust-feedback-migration.ts   # if re-applying on new env
npx tsx scripts/trust-feedback-persistence-verify.ts
```

### Step 4 smoke

```powershell
npx tsx scripts/h4-account-permission-smoke.ts
# master preview (H3/H4 routes): set H4_SMOKE_BASE_URL to latest Vercel preview URL
```

Report: `artifacts/casebrain-qa/h4-account-permission/report.json`

**Note:** Production (`www.casebrain.co.uk`) is on `main` (factory line) — trust-feedback route lives on `master`. Isolation checks pass on prod; feedback API/panels require master preview until prod promote.

### Step 5 manifest

```powershell
npx tsx scripts/build-simulator-manifest-v1.ts
npx tsx scripts/simulator-manifest-v1.test.ts
```

Manifest: `docs/h4/simulator-manifest.v1.json`

### Step 6 pack

```powershell
npx tsx scripts/h4-simulator-pack-v1-generate.ts
npx tsx scripts/h4-simulator-pack-v1-gate.ts
```

Pack: `docs/h4/simulator-pack-v1/` · Report: `artifacts/casebrain-qa/h4-simulator-pack-v1/simulator-pack-report.json`

### Step 6b v1.1 supplement (+7)

```powershell
npx tsx scripts/build-simulator-manifest-v1.1.ts
npx tsx scripts/simulator-manifest-v1.1.test.ts
npx tsx scripts/h4-simulator-pack-v1.1-generate.ts
npx tsx scripts/h4-simulator-pack-v1.1-gate.ts
```

Manifest: `docs/h4/simulator-manifest.v1.1.json` · Pack: `docs/h4/simulator-pack-v1.1/`  
Report: `artifacts/casebrain-qa/h4-simulator-pack-v1.1/simulator-pack-report.json`

v1 (30) stays locked — supplement is additive only. v2 expands to 75 with layout variants.

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
