/**
 * Gap coverage check.
 *
 * A status that is correct on Papers is only useful if the surfaces a solicitor works from
 * carry it too. For every evidence family Papers records as a gap, this reports which other
 * tabs mention that family at all — so silence is visible rather than passing as agreement.
 *
 * Usage: node gap-coverage-check.cjs <capture-dir>
 */
const fs = require("fs");
const path = require("path");

const captureDir = process.argv[2];
if (!captureDir) throw new Error("capture dir required");

const FAMILIES = [
  { id: "bank", label: "bank / account", re: /\bbank\b|\baccount statement/i },
  { id: "cctv", label: "CCTV", re: /\bcctv\b|\bfootage\b|\bcamera export\b/i },
  { id: "bwv", label: "body-worn video", re: /\bbwv\b|body[-\s]?worn/i },
  { id: "interview", label: "interview", re: /\binterview\b/i },
  { id: "cad999", label: "CAD / 999", re: /\bcad\b|\b999\b/i },
  { id: "medical", label: "medical / pathology", re: /\bmedical\b|\bpathology\b|\bfme\b/i },
  { id: "phone", label: "phone / digital", re: /\bphone\b|\bdigital extraction\b|\bhandset\b|\bsubscriber\b/i },
  { id: "forensic", label: "forensic / DNA / prints", re: /\bforensic\b|\bdna\b|\bfingerprint\b/i },
  { id: "custody", label: "custody record", re: /\bcustody\b/i },
  { id: "witness", label: "witness / MG11", re: /\bmg11\b|\bwitness statement\b/i },
  { id: "continuity", label: "continuity", re: /\bcontinuity\b/i },
];

const GAP_STATUSES = new Set([
  "Outstanding / missing",
  "Absent",
  "Partial / incomplete",
  "Draft",
  "Unsigned",
  "Referred only",
]);

const WORK_TABS = ["overview", "today", "summary", "disclosure-chase"];

function readTab(caseDir, tab) {
  const f = path.join(caseDir, `${tab}.txt`);
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
}

function papersRows(text) {
  const lines = text.split(/\n/).map((s) => s.trim()).filter(Boolean);
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\S[^\t]*\t([^\t]+)\t/);
    if (!m) continue;
    const status = m[1].trim();
    if (!GAP_STATUSES.has(status) && status !== "Served / on file") continue;
    rows.push({ material: lines[i - 1] || "", status });
  }
  return rows;
}

const casesRoot = path.join(captureDir, "cases");
let gapFamilies = 0;
let carriedEverywhere = 0;
let carriedSomewhere = 0;
let silent = 0;
const silentList = [];

for (const caseName of fs.readdirSync(casesRoot)) {
  const caseDir = path.join(casesRoot, caseName);
  const papers = readTab(caseDir, "papers");
  if (!papers) continue;
  const rows = papersRows(papers);
  if (!rows.length) continue;

  const tabText = {};
  for (const tab of WORK_TABS) tabText[tab] = readTab(caseDir, tab) ?? "";

  const lines = [];
  for (const family of FAMILIES) {
    const familyRows = rows.filter((r) => family.re.test(r.material));
    const gaps = familyRows.filter((r) => GAP_STATUSES.has(r.status));
    if (!gaps.length) continue;

    gapFamilies += 1;
    const present = WORK_TABS.filter((tab) => family.re.test(tabText[tab]));
    if (present.length === WORK_TABS.length) carriedEverywhere += 1;
    else if (present.length) carriedSomewhere += 1;
    else {
      silent += 1;
      silentList.push({ case: caseName, family: family.label, gaps: gaps.length, example: gaps[0].material.slice(0, 76) });
    }

    lines.push(
      `   ${family.label.padEnd(24)} gaps ${String(gaps.length).padStart(2)}   ` +
        WORK_TABS.map((t) => `${t}:${present.includes(t) ? "yes" : "-- "}`).join("  "),
    );
  }

  console.log(`\n### ${caseName}`);
  console.log(lines.join("\n"));
}

console.log("\n================ TOTALS ================");
console.log(`case/family gaps on Papers      : ${gapFamilies}`);
console.log(`carried on all four work tabs   : ${carriedEverywhere}`);
console.log(`carried on some work tabs       : ${carriedSomewhere}`);
console.log(`absent from every work tab      : ${silent}`);

if (silentList.length) {
  console.log("\nGaps a solicitor would never see outside Papers:");
  for (const s of silentList) {
    console.log(`  ${s.case}  ${s.family}  (${s.gaps} row(s))  e.g. ${s.example}`);
  }
}
