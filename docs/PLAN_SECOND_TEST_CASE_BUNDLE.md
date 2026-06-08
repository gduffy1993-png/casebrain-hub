# Plan: Second test case bundle (different offence for strategy comparison)

## Goal

Create a second fictional case bundle for a **different criminal charge** (e.g. arson) so you can:
- Copy/paste into a PDF and upload to CaseBrain
- Run strategy and **compare** output to the GBH/s.18 stress test case
- See that strategy **changes by offence** (arson vs GBH = different elements, routes, doctrine)

No code — just the document content and how to use it.

---

## What we need

### 1. Offence choice

- **Arson** (e.g. s.1(1) Criminal Damage Act 1971 — destroy or damage property by fire, intending to destroy/damage or reckless as to whether property would be destroyed/damaged) — good contrast: different elements (property, fire, intent/recklessness), different disclosure (fire service, forensics), different defence angles.
- Alternative: **Burglary** (s.9(1)(a) — entry as trespasser with intent to steal/damage/etc.) or **Robbery** — also strong for comparison.

**Recommendation:** Arson — you said you’d run arson and compare; one clear charge, distinct from GBH.

### 2. Same “real bundle” structure as the first case

So the second bundle looks like a real case and the engine gets the same **types** of input. Use the checklist from `REAL_CASE_BUNDLE_WHAT_TO_INCLUDE.md`:

| Section | What it contains (arson example) |
|--------|-----------------------------------|
| **1. Charge sheet** | Arson, s.1(1) CDA 1971 (or s.1(2) if intent to endanger life). Defendant, date, place, court, PTPH. |
| **2. MG5** | Case summary: fire at [building], defendant alleged to have started it, witnesses, fire service, scene. Key evidence, procedural history. |
| **3. Chronology** | Key dates (fire, arrest, charge, hearings). |
| **4. MG11s** | Witness statements: occupier, neighbour who saw smoke/defendant, fire officer, attending officer. |
| **5. Fire / scene evidence** | Short fire service report or scene summary (what was damaged, cause, origin). Replaces “medical” — still factual, mechanism. |
| **6. CCTV / BWV** | Summary: defendant near scene, or “no CCTV of interior”. Gaps if we want disclosure angles. |
| **7. Custody record** | Date in, PACE clock, interview (no comment or answered). |
| **8. Interview summary** | No comment or short account. |
| **9. Disclosure list (MG6)** | What’s been disclosed; optional “outstanding” (e.g. phone downloads, fire expert). |
| **10. Exhibit list** | Short list of exhibits. |

All **fictional** (no real names/addresses), same style as the GBH stress test.

### 3. Content that drives strategy

- **Charge sheet** — clear offence wording so offence resolution picks “arson” (or criminal_damage_arson).
- **MG5** — prosecution case in a nutshell: property, fire, defendant’s alleged role, intent/recklessness.
- **MG11s** — enough narrative so strategy can refer to identification, timing, causation, contradictions.
- **Gaps** (optional) — e.g. “CCTV of car park not retained”, “fire cause report awaited”, so disclosure/ procedural leverage appears in strategy.

### 4. How to do it

1. **Write** the second bundle in markdown (one file, like `STRESS_TEST_CASE_FULL_BUNDLE.md` but for arson).
2. **You** copy the full text into a PDF (e.g. paste into Word/Google Docs, export as PDF; or use a markdown-to-PDF tool). Ensure the PDF has **selectable text** (not just images).
3. **Upload** that PDF to a **new case** in CaseBrain (or a second case you create).
4. **Run strategy** and compare to the GBH case:
   - Resolved offence should be arson (or criminal_damage_arson).
   - Strategy should reference different elements (property, fire, recklessness/intent), different doctrine, different “what we’re waiting on” if we included disclosure gaps.
5. **Compare** in the UI: offence label, attack routes, legal tests, next actions — should feel different from the s.18 GBH case.

---

## What to expect when comparing

- **GBH (current bundle):** s.18 intent, injury threshold, causation, identification, intent denial vs s.20, procedural disclosure.
- **Arson (new bundle):** property, damage by fire, intent or recklessness, ownership/belonging to another, possible defences (accident, no intent, mistaken belief); disclosure might mention fire report, scene photos, phone data.

If strategy looks the same for both, offence resolution or route logic isn’t varying by offence yet (we’d then know to tighten that). If it looks different, the pipeline is using offence type.

---

## Deliverable

One markdown file: **`test-documents/ARSON_TEST_CASE_BUNDLE.md`** (or similar name), containing the full bundle text for the arson case, ready for you to copy into a PDF. Same level of detail as the first ~3–4 pages of the stress test (charge, MG5, chronology, 2–3 MG11s, short fire/scene summary, custody, interview, disclosure list). No need to fill 16 pages — enough text for offence resolution and a meaningful strategy comparison.
