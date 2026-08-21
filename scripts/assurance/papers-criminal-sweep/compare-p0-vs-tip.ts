/**
 * Compare P0 freeze Papers sweep vs tip re-sweep (mute/invent families).
 *   npx tsx scripts/assurance/papers-criminal-sweep/compare-p0-vs-tip.ts
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FREEZE = path.join(ROOT, "artifacts/casebrain-qa/assurance/papers-criminal-sweep-v1");
const TIP = path.join(FREEZE, "tip-resweep-e3179fa74");
const OUT = path.join(TIP, "chunk-p1-before-after.json");

type Row = {
  unique_key: string;
  inventFlags?: string[];
  muteFlags?: string[];
  modalityFlags?: string[];
  dateRoleFlags?: string[];
  ok?: boolean;
};

function loadLastByKey(ndjsonPath: string): Map<string, Row> {
  const m = new Map<string, Row>();
  if (!fs.existsSync(ndjsonPath)) return m;
  for (const line of fs.readFileSync(ndjsonPath, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line) as Row;
      if (o.unique_key) m.set(o.unique_key, o);
    } catch {
      /* skip */
    }
  }
  return m;
}

function familyCounts(rows: Map<string, Row>) {
  const invent = new Map<string, number>();
  const mute = new Map<string, number>();
  const modality = new Map<string, number>();
  let inventSum = 0;
  let hitlist = 0;
  for (const o of rows.values()) {
    const fails = [
      ...(o.inventFlags || []),
      ...(o.muteFlags || []),
      ...(o.modalityFlags || []),
      ...(o.dateRoleFlags || []),
    ];
    if (fails.length || o.ok === false) hitlist++;
    for (const f of o.inventFlags || []) {
      inventSum++;
      invent.set(f, (invent.get(f) || 0) + 1);
    }
    for (const f of o.muteFlags || []) mute.set(f, (mute.get(f) || 0) + 1);
    for (const f of o.modalityFlags || []) modality.set(f, (modality.get(f) || 0) + 1);
  }
  const top = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  return {
    scored: rows.size,
    inventSum,
    hitlist,
    invent: Object.fromEntries(top(invent)),
    mute: Object.fromEntries(top(mute)),
    modality: Object.fromEntries(top(modality)),
  };
}

function main() {
  const freeze = loadLastByKey(path.join(FREEZE, "papers-sweep.ndjson"));
  const tip = loadLastByKey(path.join(TIP, "papers-sweep.ndjson"));
  const before = familyCounts(freeze);
  const after = familyCounts(tip);

  const keys = ["mute_phone_download", "mute_export_log", "mute_cctv_master", "mute_cad_999", "invent_bwv", "invent_phone_download", "invent_phone_download_from_property"];
  const delta: Record<string, { freeze: number; tip: number; delta: number }> = {};
  for (const k of keys) {
    const f = (before.mute[k] || before.invent[k] || 0) as number;
    const t = (after.mute[k] || after.invent[k] || 0) as number;
    // invent keys live in invent map
    const f2 = before.mute[k] ?? before.invent[k] ?? 0;
    const t2 = after.mute[k] ?? after.invent[k] ?? 0;
    delta[k] = { freeze: f2, tip: t2, delta: t2 - f2 };
  }

  const out = {
    verdict:
      (after.mute.mute_phone_download ?? 0) < (before.mute.mute_phone_download ?? 0)
        ? "P1_PROOF_MUTE_PHONE_DROPPED"
        : (after.mute.mute_phone_download ?? 0) === (before.mute.mute_phone_download ?? 0)
          ? "P1_PROOF_MUTE_PHONE_FLAT"
          : "P1_PROOF_MUTE_PHONE_UP",
    freezeSha: "6e63bb6d2",
    tipSha: "e3179fa74",
    before,
    after,
    delta,
    comparedAt: new Date().toISOString(),
  };
  fs.mkdirSync(TIP, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), "utf8");
  console.log(JSON.stringify({ verdict: out.verdict, delta: out.delta, beforeHitlist: before.hitlist, afterHitlist: after.hitlist, out: OUT }, null, 2));
}

main();
