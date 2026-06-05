# Real-layout PDF/OCR Stress Lane — plan (docs only)

**Status:** **Planned — do not build until explicitly requested.**

**Purpose:** Prove CaseBrain can handle **real-layout bundle mess** (Crown/solicitor-style PDF shapes, OCR noise, bad indexes, partial disclosure) — not only clean generated bundle text.

**This is not:** 50,000 real PDFs. **50k** (Phase 4f) means **manifest/text scenario stress** at scale. This lane is a **separate, sampled** PDF/OCR realism layer.

---

## 1. Why this lane exists

Gold **7** and the strategy corpus run on **repo-safe bundle text** (structured markdown / copy-paste). That is correct for pattern survival and fingerprint collapse, but it under-tests:

- Scan/OCR artefacts and garbled headers
- Rotated or duplicated pages
- Wrong or corrected indexes and charge sheets
- MG5 / MG6 / MG11 in odd order or split across PDFs
- CCTV stills without master; CAD/999 summaries without full logs
- Interview **summary** without transcript
- Custody/PACE notes with handwriting-style noise
- Multi-count / multi-defendant index confusion
- Email screenshots and exhibit continuity breaks

The PDF/OCR lane generates **realistic fictional Crown/solicitor-style PDF bundles** from **scored scenarios**, then tests **extraction → reasoning spine** on those layouts.

---

## 2. Two lanes — keep them separate

| Lane | Scale | Primary material | What it proves |
|------|-------|------------------|----------------|
| **Manifest/text scenario stress** (4e → 4f) | 1k → 5k → 10k → **50k addressable scenarios** | Manifest + truth key + expects; bundle text rendered in gitignored cache | Pattern survival, fingerprint collapse, workflow safety across offence families and failure-mode tags |
| **Real-layout PDF/OCR stress** (this doc) | **Sampled only** — 25 → 50 → 100 → 250 if useful | Fictional PDF shells from selected scenarios | Extract/OCR robustness, layout survival, index/charge-sheet handling, partial-disclosure shapes |

**Non-negotiable:**

- **50k ≠ 50k PDFs.** Never commit or generate 50k binary PDFs as a milestone.
- PDF/OCR work stays a **small sampled subset** tied to manifest/truth keys — not a parallel bulk OCR farm.

---

## 3. Relationship to other lanes

| Upstream | Role |
|----------|------|
| **Gold 7** | Regression anchor — unchanged |
| **Strategy corpus (4e)** | Scenario recipes, truth-key schema, expects |
| **Synthetic Bundle Factory (4f)** | Parametric scenarios; PDF samples drawn from scored manifests |
| **Local real PDF ingest** (`bundle-fidelity-ingest-local-pdfs`, §9.7 lane B) | Optional **private** real layouts — gitignored; complements fictional PDF generator |
| **Real-matter auditor lane** (10–20 anonymised matters when available) | Separate hardening step; not replaced by fictional PDFs |

**Sequencing (agreed):** Client Explanation Mode → **this PDF/OCR lane (small)** → real-matter auditor when available → **then** staged 5k / 10k / 50k manifest/text scale.

---

## 4. Goal of the PDF/OCR lane

1. **Generate** realistic fictional Crown/solicitor-style PDF bundles from **already-scored scenarios** (manifest + truth key).
2. **Run** product or eval-path extraction (text/OCR) on those PDFs.
3. **Score** downstream: bundle fidelity → explanation → Proof Map → Battleboard → War Room (where expects exist).
4. **Group fingerprints** (OCR dropouts, wrong doc type, missed missing-material flags, index confusion) — **one shared fix per fingerprint**, same loop as gold/corpus.

Success = **layout mess survives extraction and does not produce unsafe advice**, not a vanity “250/250 OCR pass” headline.

---

## 5. Scale ramp (sampled PDFs only)

| Stage | PDF sample count | Notes |
|-------|------------------|-------|
| **Slice 0 — scaffold** | 0 PDFs | Schema, manifest contract, truth-key fields for layout expects; dry-run on 2–3 gold text bundles |
| **Slice 1** | **25** | Core mess patterns; manual review of OCR output; fingerprint report |
| **Slice 2** | **50** | Add rotation, duplicates, bad indexes |
| **Slice 3** | **100** | Multi-defendant, multi-count, exhibit continuity |
| **Slice 4** | **250** | Only if Slice 3 fingerprints are collapsing and storage/runtime acceptable |

PDFs live under **gitignored** paths (e.g. `artifacts/pdf-ocr-stress/`). Repo commits: **schemas, recipes, small manifests, truth keys, eval scripts** — never bulk PDF bodies.

---

## 6. Layout / mess patterns to include

Each pattern should be **tagged in manifest** so evaluators can stratify failures.

| Category | Examples |
|----------|----------|
| **Scan / OCR noise** | Skewed scans, low contrast, footer/header bleed, broken line wraps |
| **Page structure** | Rotated pages; duplicate pages; missing pages; blank separators |
| **Index / charge** | Bad indexes; corrected charge sheets; refiled counts |
| **MG placement** | MG5/MG6/MG11 in weird order; split across PDFs; draft vs final MG11 |
| **CCTV / dispatch** | CCTV stills but no master; CAD/999 summaries without full log/audio |
| **Interview / custody** | Interview summary without transcript; custody/PACE notes; handwritten-style annotations |
| **Complexity** | Multi-count; multi-defendant; wrong defendant on statement cover |
| **Continuity** | Email screenshots; exhibit list vs body mismatch; continuity gaps |

**Handwritten-style notes:** simulate via embedded images or distorted fonts in PDF generator — only where generator supports it; not a blocker for Slice 1.

---

## 7. Required artefacts per PDF sample

Every generated PDF sample **must** ship (in repo or gitignored cache per type) with:

| Artefact | Contents |
|----------|----------|
| **Manifest** | `sampleId`, source scenario id, pattern tags, materialisation status, pdf path (gitignored) |
| **Truth key** | Same schema as gold/corpus — charges, people, offence family, stage |
| **Expected metadata** | Doc types present, page count, index shape, charge version |
| **Expected missing material** | e.g. CCTV master, full CAD, interview transcript |
| **Expected contradictions** | Source conflicts the spine should surface (labels only in product) |
| **Expected strategy issues** | Proof-map / Battleboard / War Room expects where relevant (internal ids in eval only) |

No sample without a truth key. No eval without expects for missing material and do-not-overstate behaviour.

---

## 8. Safest first slice (when build is requested)

**Slice 1 — 25 PDFs, fictional only, eval-only path**

1. **Manifest + schema** — extend factory manifest with `pdfLayoutTags[]` and `pdfSampleTier` (`25` \| `50` \| …).
2. **Generator v0** — render 25 PDFs from **existing gold/scenario text** (motoring-thin, generic-provisional, one pilot-3, one S18/GBH) with **3–5 mess patterns each**:
   - thin bundle + bad index
   - CCTV stills, no master
   - interview summary only
   - corrected charge sheet
   - OCR-noise scan simulation (light)
3. **Ingest script** — `scripts/pdf-ocr-stress-ingest.ts` (or extend `bundle-fidelity-ingest-local-pdfs`) → gitignored folder + local expects.
4. **Eval runner** — `scripts/pdf-ocr-stress-fidelity.ts` — scores extraction output vs truth key (metadata, missing flags, no forbidden advice); optional chain to proof-map/battleboard/war-room on **extracted text**.
5. **Gate** — add to overnight **optional** lane first; do not block pilot-3 green on PDF lane until Slice 1 is stable.

**Out of scope for Slice 1:** production upload route changes, Supabase, billing, auto-ingest on client upload, 5k/10k/50k PDF generation.

---

## 9. What not to do

- Do **not** run 50,000 real or generated PDFs through OCR.
- Do **not** conflate manifest/text 50k scale with PDF sample count.
- Do **not** commit PDF bodies, client matter PDFs, or OCR dump artifacts.
- Do **not** tune per-`sampleId` hacks in repo.
- Do **not** block 4f manifest scale on PDF lane completion — they are parallel after Slice 1, with **manifest scale second** in priority.
- Do **not** ship product UI that auto-sends client explanations or bundle text from OCR without solicitor review.

---

## 10. Commands (planned — not implemented)

```powershell
# Generate 25 fictional PDF samples from scored manifests (gitignored output)
npx tsx scripts/pdf-ocr-stress-generate.ts --tier 25

# Ingest + extract (local OCR/extract path)
npx tsx scripts/pdf-ocr-stress-ingest.ts --tier 25

# Fidelity vs truth keys + expects
npx tsx scripts/pdf-ocr-stress-fidelity.ts --tier 25

# Optional: chain to gold evaluators on extracted text
npx tsx scripts/pdf-ocr-stress-fidelity.ts --tier 25 --stack full
```

Reports: `artifacts/casebrain-auditor/latest/pdf-ocr-stress/` (gitignored).

---

## 11. Cross-references

- `docs/CASEBRAIN_V2_MASTER_PLAN.md` — §9.6.2 row 10, §9.6.4, §9.7 lane B, §9.8 text vs PDF
- `docs/bundle-fidelity-set/README.md` — gold truth-key schema
- `docs/strategy-corpus/README.md` — scenario factory
- `scripts/bundle-fidelity-ingest-local-pdfs.ts` — existing private real-PDF ingest hook
