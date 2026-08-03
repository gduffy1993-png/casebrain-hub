from pathlib import Path
p = Path(r"C:\Users\gduff\casebrain-hub-wt-s3000-diverse\scripts\assurance\stage3000-diverse-second\v2.1.2-document-kind-layouts.ts")
lines = p.read_text(encoding="utf-8").splitlines(True)
out = []
skipped = 0
for l in lines:
    if "pageIdentity=" in l and "source pageIdentity" not in l and "compiled" not in l and "drawFooter" not in l:
        # skip body assembly of pageIdentity template line
        if "${doc.id}" in l or "${pageIndex}" in l:
            skipped += 1
            continue
    out.append(l)
p.write_text("".join(out), encoding="utf-8")
print("skipped", skipped, "lines", len(lines), "->", len(out))
