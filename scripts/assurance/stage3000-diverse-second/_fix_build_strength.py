from pathlib import Path

p = Path(r"C:\Users\gduff\casebrain-hub-wt-s3000-diverse\scripts\assurance\stage3000-diverse-second\build-v2.1.2-remediation.ts")
t = p.read_text(encoding="utf-8")
helper = '''
function isSubstantiveSolicitorLeaf(text: string): boolean {
  const s = (text || "").trim();
  if (s.length < 60) return false;
  if (/^(missing|served|operative|partial|absent|true|false|null|undefined|outstanding|available)$/i.test(s)) return false;
  if (/^[A-Za-z0-9_.:\\/\\-]+$/.test(s) && s.length < 100) return false;
  if (s === "[]" || s === "{}") return false;
  return true;
}

'''
if "isSubstantiveSolicitorLeaf" not in t:
    t = t.replace("const byFamily = new Map", helper + "const byFamily = new Map", 1)

# Only count substantive leaves in substantive bucket; route short ones out
old = "const prev = bucket.substantive.get(h);"
if old in t and "if (!isSubstantiveSolicitorLeaf(leaf.text" not in t:
    t = t.replace(
        old,
        'if (!isSubstantiveSolicitorLeaf(leaf.text || "")) continue;\n      const prev = bucket.substantive.get(h);',
        1,
    )

# Also change threshold comparison to be per-family of court/chase/five_answers/composed — 
# and compute largest among key families only
needle = "const largestSubstantive = familyClusters.reduce("
if needle in t and "KEY_SUBSTANTIVE_FAMILIES" not in t:
    t = t.replace(
        needle,
        '''const KEY_SUBSTANTIVE_FAMILIES = new Set(["court", "chase", "five_answers", "copy", "export", "pdf", "composed_prose", "api", "war_room", "key_facts", "charges", "control_room"]);
  const largestSubstantive = familyClusters.filter((c) => KEY_SUBSTANTIVE_FAMILIES.has(c.family) || /court|chase|answer|copy|export|pdf|composed|war|fact|charge|control/i.test(c.family)).reduce(''',
        1,
    )

p.write_text(t, encoding="utf-8")
print("build script patched", "isSubstantiveSolicitorLeaf" in p.read_text(encoding="utf-8"))
