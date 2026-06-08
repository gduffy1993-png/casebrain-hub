# Full-coverage eval bundles (fictional)

These `.txt` files are **Northshire-style fictional bundles** written so you can run **SHIP_EVAL questions 0–87** and get **document-backed** answers for almost every stem (R-block matches the **mixed counts** on the charge; where a stem truly does not apply, the model should still say **“not in excerpt”** honestly).

## Files

| File | Reference | Role |
|------|-----------|------|
| `NS-CPS-2026-EVAL01.txt` | NS-CPS-2026-EVAL01 | **Mega mixed counts** — theft + ABH + drugs + blade + POA + BWV + cell-site + bad character + ID lines + reconciliation tension |
| `NS-CPS-2026-EVAL02.txt` | NS-CPS-2026-EVAL02 | **Fraud / dishonesty + driving** emphasis — MG5 £ vs schedule, roadside breath, ANPR, second witness |

## Make a PDF (your machine)

1. Open the `.txt` in **Word**, **Google Docs**, or **Notepad** → **Print → Save as PDF**, **or**
2. Paste the whole block into your usual **Northshire → PDF** pipeline if you already have one.

Keep **monospace** layout if you can (tables read clearer). For Defence plan chat, paste or upload the same text your app uses for `raw_text` on the case document.

## Using with Defence plan chat

- Create a **case**, upload the PDF (or ensure `documents.raw_text` equals this file).
- Run the **same** question bank every time (`docs/fictional-golden-10/SHIP_EVAL_QUESTION_BANK.md` one-shot **0–87**).
- After deploy, compare **Q0**, **35–36**, **48**, **50** first — those were the worst regressions.

**Not legal advice. Test data only.**
