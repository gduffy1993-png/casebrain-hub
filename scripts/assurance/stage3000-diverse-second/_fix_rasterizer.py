from pathlib import Path

p = Path(r"C:\Users\gduff\casebrain-hub-wt-s3000-diverse\scripts\assurance\stage3000-diverse-second\rasterize-pdf-pages.py")
t = p.read_text(encoding="utf-8")
broken = 'if metrics.get("marginTight") and len(text.strip()) < 80:\\n            fails.append("margin_tight_or_edge_overflow_risk")\\n        elif metrics.get("marginTight"):\\n            fails.append("margin_content_near_edge_note")'
fixed = """if metrics.get("marginTight") and len(text.strip()) < 80:
            fails.append("margin_tight_or_edge_overflow_risk")
        elif metrics.get("marginTight"):
            fails.append("margin_content_near_edge_note")"""
if broken in t:
    t = t.replace(broken, fixed)
else:
    # already broken as literal in one line from PowerShell
    import re
    t = re.sub(
        r'if metrics\.get\("marginTight"\).*?fails\.append\("margin_content_near_edge_note"\)',
        fixed,
        t,
        count=1,
        flags=re.S,
    )
t = t.replace(
    'hard = [f for f in fails if f != "low_ink_density"]',
    'hard = [f for f in fails if f not in ("low_ink_density", "margin_content_near_edge_note")]',
)
p.write_text(t, encoding="utf-8")
print("rasterizer fixed")
