# What a real criminal case PDF bundle contains

Use this as a checklist when building test PDFs (one big PDF or several). The system reads **text content** — it doesn’t care about file names or labels. One huge PDF with everything in it is fine, as long as the PDF has **real text** (not scanned images).

---

## 1. Charge sheet / indictment

- Offence name(s), e.g. “Wounding with intent (s.18 OAPA 1861)” or “Burglary (s.9(1)(a) Theft Act 1968)”
- Section numbers
- Date(s) of offence
- Defendant name/initials (can be redacted to “DEF” if needed)

*Why it matters:* The engine uses this to resolve offence type (GBH, burglary, robbery, etc.) and pick the right strategy.

---

## 2. MG5 (Case summary)

- Brief summary of the prosecution case
- Key facts, dates, location
- List of main evidence (CCTV, witnesses, forensics)
- Sometimes a short “defendant’s account” or “no comment”

*Why it matters:* Gives the engine an overview so strategy can reference disclosure, evidence gaps, and case strength.

---

## 3. MG11 (Witness statements)

- Witness name/role (e.g. “PC Smith”, “Complainant”)
- Date of statement
- What they say happened (narrative)
- References to exhibits (CCTV, photos)

*Why it matters:* Strategy can pick up on contradictions, identification, timing, and causation.

---

## 4. Medical evidence (if assault/GBH)

- Doctor/hospital report or summary
- Injuries described (e.g. “laceration”, “fracture”, “bruising”)
- Mechanism (single blow vs multiple, weapon vs fist)
- Treatment and prognosis

*Why it matters:* For GBH/s18/s20, strategy uses this for intent (s18 vs s20), causation, and injury threshold.

---

## 5. CCTV / BWV notes or summary

- What the footage shows (e.g. “Defendant and complainant in car park”, “Blow to head”)
- Timing (e.g. “19:42 – altercation begins”)
- Whether BWV (body-worn) or fixed CCTV
- Any gaps or “footage not retained”

*Why it matters:* Strategy references CCTV continuity, identification, and sequence evidence.

---

## 6. Custody record (if relevant)

- Date and time in custody
- PACE clock / next review
- Interview time and “no comment” or “answered”
- Solicitor attendance

*Why it matters:* For PACE, procedural leverage, and disclosure.

---

## 7. Disclosure list / MG6 (optional but useful)

- List of unused material or schedules
- What’s been requested vs received

*Why it matters:* Strategy can mention disclosure gaps and chase lists.

---

## Do the PDFs have to be labelled?

**No.** The system doesn’t rely on file names or labels. It:

- Reads the **text** inside each document (or one big document).
- Resolves offence from **content** (e.g. “s.18”, “burglary”, “MG5”, “charge sheet” in the text).
- Builds strategy from that text.

So you can have:

- **One huge PDF** with all of the above sections in order (e.g. “Charge sheet” then “MG5” then “MG11” then “Medical” then “CCTV notes”), or  
- **Several PDFs** (e.g. “charges.pdf”, “mg5.pdf”, “statements.pdf”) with no special naming.

The only hard requirement: **the PDF must contain real, selectable text.** If it’s all scanned images, run it through OCR first and save as a new PDF with a text layer, then upload that.

---

## Minimal “works well” bundle

For the engine to resolve offence and give a good strategy, aim for at least:

1. **Charge sheet** (or a paragraph that clearly states the offence and section).
2. **Some case summary or statements** (MG5-style or MG11-style narrative).

Everything else (medical, CCTV notes, custody) improves the strategy but isn’t strictly required for offence resolution and a non-generic strategy.
