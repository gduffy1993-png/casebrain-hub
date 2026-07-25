# Pilot design freeze — Malik / Price 150-page controlled PDF

**Status:** DESIGN_FROZEN v1.1 — **STOP FOR REVIEW**  
**Freeze hash (SHA-256):** `75b4df080358baa20bd44a80344dff181e6cb623981bed69f192d133e992773e`  
**programmePassSupported:** false  
**Generation authorised:** no  
**Live application changes authorised:** no  
**Commit / push / merge / deploy authorised:** no  

Controlled / synthetic pilot only — not solicitor-reviewed real-world audit.

## Count 3 correction (v1.1)

STATEMENT OF OFFENCE — Having an article with a blade or point in a public place, contrary to section 139(1) of the Criminal Justice Act 1988.  
PARTICULARS OF OFFENCE — Jordan Price, on 3 June 2026, at Merton Parade, Northgate, had with him in a public place a locking knife, being an article which had a blade or was sharply pointed.

- “folding knife” → **locking knife**
- Removed “without good reason or lawful authority” from particulars (statutory defence)

## Locked decisions (accepted)

| Decision | Lock |
|----------|------|
| Evidence form | Separate realistic source documents → compile to **one continuous 150-page PDF**; retain individuals + compiled bundle |
| Authoritative pagination | **Compiled PDF page numbers** |
| Counts | (1) Robbery — both; (2) OAPA s18 wounding with intent — **Malik only**; (3) CJA 1988 s139 bladed article — **Price only** |
| Charge wording | Exact specimen text in truth key; **independently checked before generation**; never silent citation substitution |
| Knife | Separate possession allegation; may appear in joint chronology; **no inference** that it caused the wound, that Price used it, or that Price knew Malik had another weapon |
| Interviews | **PACE suspect interviews** both defendants; Malik audio complete + **one transcript page missing** → “recording served / transcript incomplete” (not “interview missing”); **no ABE** for defendants |
| Hearing | Latest **court notice = operative PTPH**; older MG5 different date/time → use notice, preserve/explain discrepancy |
| Pass bar | Hard pass: zero forbidden/unsupported conclusions; 100% required findings + provenance; zero co-def leakage; zero hidden omissions/quarantine; audience separation; consistent copy/export/API/composed. Safety false statement or missing mandatory warning = hard fail. Minor presentation = quality only |
| Extra traps (this pilot only) | Co-def bleed; exhibit-label collision; custody/interview clock conflict; already-served item re-requested under alias |
| Deferred | Youth; ABE; remaining optional traps |

## Frozen artefacts (this folder)

| File | Purpose |
|------|---------|
| `matter-skeleton.json` | Parties, venue, stage, counts, chronology ground truth, defendant matrix rules |
| `page-register.json` | Fixed 150-page map + trap annotations + source document IDs |
| `truth-key.json` | Specimen charges, required findings, forbidden conclusions, evidence states |
| `conflict-table.json` | Hierarchy winners when documents conflict |
| `acceptance-matrix.json` | Hard-pass / quality gates across surfaces and exits |

## Next step (human / Codex review only)

1. Independently check specimen charge wording in `truth-key.json`.  
2. Confirm names/dates/places.  
3. Only then commission generation of source docs + compiled PDF + gold keys.

Do **not** generate PDFs or wire into the live app from this freeze.
