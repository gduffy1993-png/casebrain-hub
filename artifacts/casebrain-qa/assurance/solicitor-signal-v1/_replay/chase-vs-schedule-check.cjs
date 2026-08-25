/**
 * What the CPS Chase list carries, against what the schedule actually says is missing.
 *
 * Papers rows that carry a schedule reference and a gap status are the gaps the papers
 * state in terms. This compares them with the items the chase surface presents, so the
 * difference between "stated in the schedule" and "offered to the solicitor" is countable.
 *
 * Usage: node chase-vs-schedule-check.cjs <capture-dir>
 */
const fs = require("fs");
const path = require("path");

const captureDir = process.argv[2];
if (!captureDir) throw new Error("capture dir required");

const GAP_STATUSES = new Set([
  "Outstanding / missing",
  "Absent",
  "Partial / incomplete",
  "Draft",
  "Unsigned",
  "Referred only",
]);

const CHASE_STATE_RE = /^(?:NEEDS CONFIRMATION|OVERDUE|DUE SOON|CHASED|RECEIVED|NOT STARTED|REFERRED ONLY|MISSING)$/;

function readTab(caseDir, tab) {
  const f = path.join(caseDir, `${tab}.txt`);
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
}

/** Schedule-referenced gap rows: the gaps the papers state explicitly. */
function scheduleGaps(papersText) {
  const lines = papersText.split(/\n/).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\S[^\t]*\t([^\t]+)\t/);
    if (!m) continue;
    const status = m[1].trim();
    if (!GAP_STATUSES.has(status)) continue;
    const material = lines[i - 1] || "";
    const ref = material.match(/^((?:MG\d{1,2}[A-Z]?\/|[A-Z]{2,4}\/)\d{1,4}|[A-Z]{1,3}\d{2,3})\b/);
    if (!ref) continue;
    out.push({ ref: ref[1], material, status });
  }
  return out;
}

/** Chase item titles: the line two above each state badge. */
function chaseItems(chaseText) {
  const lines = chaseText.split(/\n/).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
  const items = [];
  for (let i = 0; i < lines.length; i++) {
    if (!CHASE_STATE_RE.test(lines[i])) continue;
    const title = lines[i - 2];
    if (!title || title.length < 6 || CHASE_STATE_RE.test(title)) continue;
    if (!items.includes(title)) items.push(title);
  }
  return items;
}

const casesRoot = path.join(captureDir, "cases");
let totalStated = 0;
let totalNamed = 0;
let totalChase = 0;

for (const caseName of fs.readdirSync(casesRoot)) {
  const caseDir = path.join(casesRoot, caseName);
  const papers = readTab(caseDir, "papers");
  const chase = readTab(caseDir, "disclosure-chase");
  if (!papers || !chase) continue;

  const gaps = scheduleGaps(papers);
  const items = chaseItems(chase);

  // A stated gap is "named" if any chase item shares its distinctive words.
  const named = gaps.filter((g) => {
    const words = g.material.toLowerCase().match(/[a-z]{5,}/g) ?? [];
    const key = words.filter((w) => !["outstanding", "papers", "supplied", "served"].includes(w));
    if (!key.length) return false;
    return items.some((it) => {
      const l = it.toLowerCase();
      return key.some((w) => l.includes(w));
    });
  });

  totalStated += gaps.length;
  totalNamed += named.length;
  totalChase += items.length;

  console.log(`\n### ${caseName}`);
  console.log(`    schedule gaps stated : ${gaps.length}`);
  console.log(`    chase items offered  : ${items.length}`);
  console.log(`    stated gaps named    : ${named.length}`);
  if (items.length) {
    console.log("    chase list:");
    for (const it of items) console.log(`      - ${it.slice(0, 90)}`);
  }
  const missed = gaps.filter((g) => !named.includes(g));
  if (missed.length) {
    console.log("    stated in the schedule, not on the chase list:");
    for (const m of missed.slice(0, 10)) console.log(`      ! ${m.ref.padEnd(10)} ${m.status.padEnd(22)} ${m.material.slice(0, 70)}`);
  }
}

console.log("\n================ TOTALS ================");
console.log(`schedule-stated gaps across cases : ${totalStated}`);
console.log(`chase items offered               : ${totalChase}`);
console.log(`stated gaps actually named        : ${totalNamed}`);
console.log(`stated gaps never offered         : ${totalStated - totalNamed}`);
