import fitz, json, re, hashlib
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "_extracts"
OUT.mkdir(parents=True, exist_ok=True)

CASES = [
  ("ARDEN-MONSTER-0001", r"C:\Users\gduff\Downloads\CaseBrain_Monster_and_Charge_Coverage_2026\casebrain_monster_charge\Monster_Bundle_Load_Pack\pdfs\CB-MONSTER-2026-0001.pdf"),
  ("ISAAC-PATEL-TB-546", r"C:\Users\gduff\Downloads\00-CASEBRAIN-PILOT-20\CB-TB-546_Patel.pdf"),
  ("MONSTER-0002", r"C:\Users\gduff\Downloads\CaseBrain_Monster_and_Charge_Coverage_2026\casebrain_monster_charge\Monster_Bundle_Load_Pack\pdfs\CB-MONSTER-2026-0002.pdf"),
  ("MONSTER-0003", r"C:\Users\gduff\Downloads\CaseBrain_Monster_and_Charge_Coverage_2026\casebrain_monster_charge\Monster_Bundle_Load_Pack\pdfs\CB-MONSTER-2026-0003.pdf"),
  ("CB-CHARGE-2026-0001", r"C:\Users\gduff\Downloads\CaseBrain_Monster_and_Charge_Coverage_2026\casebrain_monster_charge\Charge_Coverage_Smoke_Pack\pdfs\CB-CHARGE-2026-0001.pdf"),
  ("CB-CHARGE-2026-0039", r"C:\Users\gduff\Downloads\CaseBrain_Monster_and_Charge_Coverage_2026\casebrain_monster_charge\Charge_Coverage_Smoke_Pack\pdfs\CB-CHARGE-2026-0039.pdf"),
  ("RP-03-TOBIN", r"C:\Users\gduff\Downloads\cb-tb-1601-2200-v5-factory-run\pdfs\CB-TB-1925_Tobin.pdf"),
  ("RP-13-DUNN", r"C:\Users\gduff\Downloads\cb-tb-301-400-v4\pdfs\CB-TB-343_Dunn.pdf"),
  ("RP-17-FRESH-BROOKES", r"C:\Users\gduff\Downloads\CB-FRESH-001_Taylor_Brookes_Digital_Attribution.pdf"),
  ("RP-08-OCR-0013", r"C:\Users\gduff\Downloads\CaseBrain_Pack_U_CB_OCR_2026_AUDITED_UPGRADED\CaseBrain_Pack_U_CB_OCR_2026_AUDITED_UPGRADED\pdfs\CB-OCR-2026-0013.pdf"),
  ("RP-15-DAVIES", r"C:\Users\gduff\Downloads\cb-tb-401-500-v5\pdfs\CB-TB-439_Davies.pdf"),
  ("RP-04-VALE039", r"C:\Users\gduff\Downloads\cb-tb-001-050-v3\pdfs\CB-TB-039_Vale.pdf"),
  ("RP-10-PATTERSON", r"C:\Users\gduff\Downloads\CaseBrain_Blind_Bundle_Factory_v2_30_bundles (1)\pdfs\CB-TB-014_James_Patterson.pdf"),
  ("RP-06-LEVERAGE", r"C:\Users\gduff\Downloads\CaseBrain_Packs_V_W_X_2026\CaseBrain_Packs_V_W_X_2026\Pack_V_CB_LEVERAGE_2026\pdfs\CB-LEVERAGE-2026-0001.pdf"),
  ("RP-09-TRAP-0030", r"C:\Users\gduff\Downloads\CaseBrain_Eval_Regression_Packs_C_D\CaseBrain_Eval_Regression_Packs_C_D\Pack_C_Hallucination_Trap\PDFs\CB-TRAP-2026-0030.pdf"),
  ("RP-16-AHMED", r"C:\Users\gduff\Downloads\cb-tb-1501-1600-v5-factory-run\pdfs\CB-TB-1573_Ahmed.pdf"),
  ("RP-02-GRANT", r"C:\Users\gduff\Downloads\cb-tb-1601-1700-v5-chaos\pdfs\CB-TB-1681_Grant.pdf"),
]

TERMS = [
  r"CCTV", r"master", r"stills", r"export\s*log", r"continuity",
  r"\bCAD\b", r"999", r"interview", r"recording", r"transcript", r"ABE",
  r"phone", r"download", r"extraction", r"subscriber", r"property",
  r"MG6", r"MG6C", r"MG11", r"unused", r"identification", r"ID procedure",
  r"BWV", r"body[- ]?worn", r"custody", r"ANPR", r"hearing", r"PTPH",
]
CRE = [(t, re.compile(t, re.I)) for t in TERMS]

manifest = []
for key, path in CASES:
    p = Path(path)
    if not p.exists():
        manifest.append({"case_key": key, "ok": False, "error": "missing"})
        print(f"MISSING {key}")
        continue
    doc = fitz.open(str(p))
    pages = []
    term_hits = {t: 0 for t, _ in CRE}
    term_excerpts = {t: [] for t, _ in CRE}
    full_parts = []
    for i in range(len(doc)):
        text = doc[i].get_text("text") or ""
        pages.append({"page": i + 1, "chars": len(text), "text": text})
        full_parts.append(f"\n===== PAGE {i+1} =====\n{text}")
        for t, cre in CRE:
            for m in cre.finditer(text):
                term_hits[t] += 1
                if len(term_excerpts[t]) < 4:
                    start = max(0, m.start() - 120)
                    end = min(len(text), m.end() + 160)
                    excerpt = re.sub(r"\s+", " ", text[start:end]).strip()
                    term_excerpts[t].append({"page": i + 1, "excerpt": excerpt})
    h = hashlib.sha256(p.read_bytes()).hexdigest()
    full = "".join(full_parts)
    (OUT / f"{key}.full.txt").write_text(full[:800000], encoding="utf-8")
    key_pages = {}
    for pg in pages[:3]:
        key_pages[str(pg["page"])] = pg["text"][:2500]
    for t, excerpts in term_excerpts.items():
        for ex in excerpts[:2]:
            pg = str(ex["page"])
            if pg not in key_pages:
                txt = next(x["text"] for x in pages if x["page"] == ex["page"])
                key_pages[pg] = txt[:2500]
    summary = {
        "case_key": key,
        "ok": True,
        "pdf_path": path,
        "pdf_sha256": h,
        "page_count": len(doc),
        "char_count": sum(pg["chars"] for pg in pages),
        "term_hits": {k: v for k, v in term_hits.items() if v > 0},
        "term_excerpts": {k: v for k, v in term_excerpts.items() if v},
        "key_pages": key_pages,
        "first_page_preview": (pages[0]["text"][:800] if pages else ""),
    }
    (OUT / f"{key}.summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    top = sorted(summary["term_hits"], key=lambda x: -summary["term_hits"][x])[:12]
    manifest.append({
        "case_key": key,
        "ok": True,
        "pages": len(doc),
        "chars": summary["char_count"],
        "sha": h[:12],
        "hit_terms": top,
    })
    print(f"OK {key} pages={len(doc)} chars={summary['char_count']} top={top[:6]}")
    doc.close()

(OUT / "MANIFEST.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
print("DONE", sum(1 for m in manifest if m.get("ok")), "/", len(manifest))
