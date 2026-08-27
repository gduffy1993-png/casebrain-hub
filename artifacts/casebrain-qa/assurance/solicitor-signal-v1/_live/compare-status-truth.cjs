/**
 * Compare Papers status rows before/after the schedule-status truth fix.
 * Pairs each material line with the status cell rendered beneath it.
 */
const fs = require("fs");
const path = require("path");

const roots = {
  before: process.argv[2],
  after: process.argv[3],
};

const STATUS_RE =
  /^(?:MG6|MG5|MG11|Source material|Interview|CCTV \/ imagery|Digital \/ phone|CAD \/ 999|Charge)\t(.+?)\t/;

function rowsFor(file) {
  if (!fs.existsSync(file)) return null;
  const lines = fs
    .readFileSync(file, "utf8")
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const rows = new Map();
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(STATUS_RE);
    if (!m) continue;
    const material = lines[i - 1] || "";
    rows.set(material, m[1]);
  }
  return rows;
}

function counts(file) {
  if (!fs.existsSync(file)) return null;
  const t = fs.readFileSync(file, "utf8");
  const m = t.match(/(\d+) material row\(s\).*?(\d+) served\/on-file.*?(\d+) gap/);
  return m ? { rows: +m[1], served: +m[2], gaps: +m[3] } : null;
}

const cases = fs.readdirSync(path.join(roots.after, "cases"));
let flips = 0;

for (const c of cases) {
  const beforeFile = path.join(roots.before, "cases", c, "papers.txt");
  const afterFile = path.join(roots.after, "cases", c, "papers.txt");
  const b = rowsFor(beforeFile);
  const a = rowsFor(afterFile);
  if (!b || !a) continue;

  const cb = counts(beforeFile);
  const ca = counts(afterFile);
  console.log(
    `\n=== ${c}\n    served/on-file: ${cb?.served} -> ${ca?.served}   rows: ${cb?.rows} -> ${ca?.rows}`,
  );

  const changed = [];
  for (const [material, status] of a) {
    const prev = b.get(material);
    if (prev && prev !== status) changed.push(`    CHANGED  ${material.slice(0, 78)}\n             ${prev}  ->  ${status}`);
  }
  // Rows whose material text itself changed (de-glued) are reported separately.
  const newMaterials = [...a.keys()].filter((k) => !b.has(k));
  const goneMaterials = [...b.keys()].filter((k) => !a.has(k));

  flips += changed.length;
  if (changed.length) console.log(changed.join("\n"));
  if (newMaterials.length) {
    console.log("    ROW TEXT NOW READABLE:");
    for (const n of newMaterials.slice(0, 8)) console.log(`      + ${n.slice(0, 88)}  [${a.get(n)}]`);
  }
  if (goneMaterials.length) {
    console.log("    PREVIOUS ROW TEXT:");
    for (const g of goneMaterials.slice(0, 8)) console.log(`      - ${g.slice(0, 88)}  [${b.get(g)}]`);
  }
}

console.log(`\nTOTAL STATUS FLIPS ON IDENTICAL ROW TEXT: ${flips}`);
