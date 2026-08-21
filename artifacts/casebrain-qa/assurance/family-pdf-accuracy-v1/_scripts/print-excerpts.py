import json
from pathlib import Path

base = Path(r"C:\Users\gduff\casebrain-hub-wt-f167-surgical-truth-v1\artifacts\casebrain-qa\assurance\family-pdf-accuracy-v1\_extracts")
keys = [
    "ARDEN-MONSTER-0001",
    "ISAAC-PATEL-TB-546",
    "RP-17-FRESH-BROOKES",
    "RP-13-DUNN",
    "CB-CHARGE-2026-0001",
    "RP-06-LEVERAGE",
    "RP-09-TRAP-0030",
    "RP-08-OCR-0013",
    "MONSTER-0002",
    "RP-03-TOBIN",
    "RP-16-AHMED",
    "RP-02-GRANT",
    "CB-CHARGE-2026-0039",
    "RP-04-VALE039",
    "RP-10-PATTERSON",
    "RP-15-DAVIES",
    "MONSTER-0003",
]
want = [
    "phone",
    "download",
    "CCTV",
    "master",
    "stills",
    "export\\s*log",
    "interview",
    "recording",
    "\\bCAD\\b",
    "999",
    "MG6",
    "MG11",
    "identification",
    "subscriber",
    "BWV",
    "property",
    "transcript",
]
out_lines = []
for k in keys:
    p = base / f"{k}.summary.json"
    if not p.exists():
        out_lines.append(f"NO {k}")
        continue
    s = json.loads(p.read_text(encoding="utf-8"))
    out_lines.append(f"\n==== {k} pages={s['page_count']} ====")
    out_lines.append(f"hits {s.get('term_hits')}")
    for t in want:
        for e in (s.get("term_excerpts", {}).get(t) or [])[:2]:
            out_lines.append(f"  [{t}] p{e['page']}: {e['excerpt'][:260]}")

Path(base / "FOCUSED-EXCERPTS.txt").write_text("\n".join(out_lines), encoding="utf-8")
print("wrote", base / "FOCUSED-EXCERPTS.txt", "lines", len(out_lines))
