# Overnight Master — final readiness report

**Recorded:** 2026-08-20T03:22:00Z (approx)  
**Product worktree:** `C:\Users\gduff\casebrain-hub-wt-real-pdf-live-pilot`  
**Branch / PR:** `programme/real-pdf-live-pilot-v1` / [#66](https://github.com/gduffy1993-png/casebrain-hub/pull/66)  
**Frozen HEAD under test:** `da6fc1b9ac99dc8dc154a06548762b759d8646c8`  
**Verdict:** **CONDITIONAL READY** for a tightly supervised solicitor pilot

---

## 1. Final unique criminal case/bundle count (assurance feed)

| Metric | Count |
|--------|------:|
| **Final unique criminal case/bundle count** | **589** |
| Of which assurance-runnable (bundle-text + truth-key, holdout sealed) | **449** |
| PDF-classified criminal (pre-ESA enrichment, hash-set deduped) | 172 |
| ESA criminal matters enriched (text/truth present) | +419 net into corpus |
| Holdout sealed (not audited) | 80 |

This is **not** 3000. Messy-v9 “3000” remains a declared synthetic identity pool; only physically/source-backed criminal matters were assurance-fed.

---

## 2. Global corpus sizes (SHA-256 merge)

| Metric | Count |
|--------|------:|
| Local PDF copies | 4,548 |
| Unique local PDFs | 2,408 |
| Cloud PDF document objects (legacy orgs) | 1,120 |
| Unique cloud PDFs hashed | 292 |
| Local ∩ cloud duplicate hashes | 0 |
| Cloud-only unique PDFs | 292 |
| Local-only unique PDFs | 2,408 |
| **Globally unique PDFs** | **2,700** |
| **Globally unique case/bundle groups** | **864** |
| Synthetic/template-likely bundles | 248 |
| Inaccessible/missing cloud objects | **828** |

**Cloud census caveat:** Supabase Storage returned HTTP **544/522** mid-run after ~292 successful content hashes. Remaining objects were recorded inaccessible (no DB/storage mutation). Local name+size seeding found minimal unique matches. Re-run `build-global-corpus-manifest-readonly.ts --resume` when storage recovers.

Artefacts: `GLOBAL-CORPUS-MANIFEST.md`, `global-corpus-summary.json`, `cloud-pdf-hashes.ndjson`.

---

## 3. Legal-domain classification (unique PDFs / bundles)

### Per-PDF (content + metadata scoring; filename alone never decisive)

| Domain | Unique PDFs |
|--------|------------:|
| CRIMINAL_DEFENCE | 198 |
| HOUSING | 0 |
| OTHER_LEGAL | 0 |
| NON_LEGAL | 0 |
| UNKNOWN_REQUIRES_REVIEW | 2,502 |
| **Total** | **2,700** |

### Per-bundle (pre-enrichment PDF corpus)

| Domain | Bundles |
|--------|--------:|
| CRIMINAL_DEFENCE | 173 (172 unique by hash-set) |
| HOUSING | 0 |
| OTHER_LEGAL | 0 |
| NON_LEGAL | 0 |
| UNKNOWN_REQUIRES_REVIEW | 691 |

Unknown-heavy result is intentional conservatism (weak/OCR/no-text samples → UNKNOWN, not forced criminal). ESA truth-key enrichment then added criminal text/truth matters missing from PDF-only discovery.

Artefacts: `DOMAIN-CLASSIFICATION-REPORT.md`, `domain-classification-summary.json`, `criminal-corpus-manifest.json`.

---

## 4. Master release-assurance (existing tier runner only)

| Tier | Matters | Claims | Confirmed P0/P1/P2 | Gate |
|------|--------:|-------:|-------------------:|------|
| gold40 | 40 | 806 | 0 | CLEAN |
| rep150 | 150 | 3,288 | 0 | CLEAN |
| highrisk500 | 409 | 8,292 | 0 | CLEAN |
| criminalPhysical | **449** | **9,098** | **0** | **CLEAN** |

- Holdout remains sealed.
- Stratified green review: **40** cases, **0** blind-spot candidates after fixing a false-positive substring matcher (`bank statement summaries` ≠ chase `source bank statements`).
- Phrase anomaly distributions (signals only, not auto-defects): BWV-outstanding wording hits 226; CAD/999 compound 0; self-defence-live 0.

No shared-root product defects confirmed this run → no product code fix/redeploy loop required. Assurance tooling matcher fix only.

---

## 5. What was NOT claimed / NOT done

- Did **not** claim 3,000 unique physical criminal cases.
- Did **not** mutate production DB/storage (read-only downloads/hashes only; then storage outage).
- Did **not** open holdout.
- Did **not** invent a parallel auditor architecture.
- Cloud hash census **incomplete** (828 inaccessible) — must resume when Storage healthy before treating cloud-only PDFs as fully inventoried.

---

## 6. Readiness rationale

**CONDITIONAL READY** because:

1. All runnable criminal source-backed matters (449) claim-audited clean at HEAD `da6fc1b9`.
2. Safety gates gold/rep/high-risk clean.
3. Green sample clean after auditor FP fix.
4. Conditions / residual risk:
   - 828 cloud PDFs not content-hashed (infra 544).
   - Large UNKNOWN PDF pool may hide housing/other once text-recoverable — keep domain gate before any future scale-up.
   - Pilot must stay tightly supervised; not “perfect/unbreakable”.

---

## Key artefact directory

`artifacts/casebrain-qa/assurance/master-auditor-v2/master-3000-release-assurance/`
