/**
 * Compare Court C0 freeze vs tip-resweep after C1 armour.
 * Usage: npx tsx scripts/assurance/court-criminal-sweep/compare-c0-vs-tip.ts
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FREEZE = path.join(ROOT, "artifacts/casebrain-qa/assurance/court-criminal-sweep-v1");
const TIP = path.join(FREEZE, "tip-resweep-7b900de22");

function tally(ndjsonPath: string): { scored: number; invent: Record<string, number>; mute: Record<string, number>; hitInventSum: number } {
  const invent: Record<string, number> = {};
  const mute: Record<string, number> = {};
  let scored = 0;
  let hitInventSum = 0;
  if (!fs.existsSync(ndjsonPath)) return { scored: 0, invent, mute, hitInventSum };
  for (const line of fs.readFileSync(ndjsonPath, "utf8").split(/\n/).filter(Boolean)) {
    const o = JSON.parse(line) as { inventFlags?: string[]; muteFlags?: string[]; ok?: boolean; route?: string };
    if (o.route === "SKIP") continue;
    if (!o.ok && !(o.inventFlags || o.muteFlags)) continue;
    scored++;
    for (const f of o.inventFlags || []) {
      invent[f] = (invent[f] || 0) + 1;
      hitInventSum++;
    }
    for (const f of o.muteFlags || []) mute[f] = (mute[f] || 0) + 1;
  }
  return { scored, invent, mute, hitInventSum };
}

const before = tally(path.join(FREEZE, "court-sweep.ndjson"));
const after = tally(path.join(TIP, "court-sweep.ndjson"));

const keys = [
  "invent_bwv",
  "invent_interview_recording",
  "invent_cad_999",
  "invent_cctv_master",
  "invent_phone_download",
  "invent_bwv_full_export_from_stills",
];

const rows = keys.map((k) => ({
  family: k,
  freeze: before.invent[k] || 0,
  tip: after.invent[k] || 0,
  delta: (after.invent[k] || 0) - (before.invent[k] || 0),
}));

const out = {
  productTip: "7b900de22",
  freezeScored: before.scored,
  tipScored: after.scored,
  freezeInventSum: before.hitInventSum,
  tipInventSum: after.hitInventSum,
  families: rows,
  mutePhone: {
    freeze: before.mute.mute_phone_download || 0,
    tip: after.mute.mute_phone_download || 0,
  },
};

const outPath = path.join(TIP, "chunk-c1-before-after.json");
fs.mkdirSync(TIP, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(JSON.stringify(out, null, 2));
console.log("wrote", outPath);
