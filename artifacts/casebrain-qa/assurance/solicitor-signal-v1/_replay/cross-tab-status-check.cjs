/**
 * Cross-tab status consistency check.
 *
 * Papers holds the material ledger, so it is treated as the stated position. Every other
 * solicitor surface is then read for claims about the same evidence family, and any surface
 * that upgrades a gap to "on file", or writes off something the schedule records as served,
 * is reported.
 *
 * Usage: node cross-tab-status-check.cjs <capture-dir>
 */
const fs = require("fs");
const path = require("path");

const captureDir = process.argv[2];
if (!captureDir) throw new Error("capture dir required");

/** Evidence families worth holding a line on, with the words that identify them. */
const FAMILIES = [
  { id: "bank", label: "bank / account material", re: /\bbank\b|\baccount statement/i },
  { id: "cctv", label: "CCTV", re: /\bcctv\b|\bfootage\b|\bcamera export\b/i },
  { id: "bwv", label: "body-worn video", re: /\bbwv\b|body[-\s]?worn/i },
  { id: "interview", label: "interview record", re: /\binterview\b(?!.*\bsummary only\b)|\bpace interview\b/i },
  { id: "cad999", label: "CAD / 999", re: /\bcad\b|\b999\b|\bdispatch log\b/i },
  { id: "medical", label: "medical / pathology", re: /\bmedical\b|\bpathology\b|\bfme\b|\binjury report\b/i },
  { id: "phone", label: "phone / digital", re: /\bphone download\b|\bdigital extraction\b|\bhandset\b|\bsubscriber\b|\bphone extraction\b/i },
  { id: "forensic", label: "forensic / DNA / prints", re: /\bforensic\b|\bdna\b|\bfingerprint\b/i },
  { id: "custody", label: "custody record", re: /\bcustody record\b|\bcustody extract\b/i },
  { id: "witness", label: "witness statement / MG11", re: /\bmg11\b|\bwitness statement\b/i },
  { id: "continuity", label: "continuity", re: /\bcontinuity\b/i },
];

const GAP_STATUSES = new Set([
  "Outstanding / missing",
  "Absent",
  "Partial / incomplete",
  "Draft",
  "Unsigned",
  "Referred only",
  "Not safely confirmed",
]);

/** Wording that asserts the material is on file. */
const SERVED_CLAIM_RE =
  /\b(?:is|are|has been|have been|was|were)\s+(?:now\s+)?(?:served|provided|disclosed|supplied)\b|\bserved on (?:the )?(?:file|bundle|papers)\b|\bon file\b|\bin the bundle\b|\bcontained in (?:the )?papers\b|\bavailable in bundle\b/i;

/** Wording that asserts the material is not on file. */
const GAP_CLAIM_RE =
  /\bnot\s+(?:yet\s+)?served\b|\boutstanding\b|\bmissing\b|\bawait(?:ed|ing)\b|\bnot on file\b|\bnot attached\b|\bnot in (?:the )?papers\b|\bchase\b|\brequest(?:ed)?\s+from\b|\bto follow\b/i;

/** Service framed as a condition is not a claim either way. */
const CONDITIONAL_RE =
  /\b(?:if|where|when|once|unless|until|subject to|pending|before)\b[^.]{0,90}?\b(?:served|provided|disclosed|supplied|service)\b/i;

/**
 * Lines that exist to stop a claim being made ("Avoid stating MG11 is served"). They quote
 * the wording precisely because it is not safe, so they are not claims.
 */
const GUARD_RE =
  /\bavoid stating\b|\bavoid saying\b|\bdo not (?:establish|state|say|claim|treat|assert)\b|\bdoes not establish\b|\bcannot be\b|\bmust not\b|\bnot fully served\b|\bnot safely\b|\bremains? provisional\b|\brequires? caution\b|\bshould not be\b|\bno conclusion\b/i;

/** Generic file-count language that is about the upload, not the material. */
const UPLOAD_NOISE_RE = /\b\d+\s+(?:file|document)\(?s?\)?\s+on (?:record|file)\b|\bdocument on file\b/i;

function readTab(caseDir, tab) {
  const f = path.join(caseDir, `${tab}.txt`);
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
}

/** Papers rows: a material line followed by a status cell line. */
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

function sentences(text) {
  return text
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 25 && l.length < 400);
}

const TABS = ["overview", "today", "summary", "disclosure-chase", "file"];
const casesRoot = path.join(captureDir, "cases");
const findings = [];
let checkedFamilies = 0;

for (const caseName of fs.readdirSync(casesRoot)) {
  const caseDir = path.join(casesRoot, caseName);
  const papers = readTab(caseDir, "papers");
  if (!papers) continue;

  const rows = papersRows(papers);
  if (!rows.length) continue;

  for (const family of FAMILIES) {
    const familyRows = rows.filter((r) => family.re.test(r.material));
    if (!familyRows.length) continue;
    const anyServed = familyRows.some((r) => r.status === "Served / on file");
    const allServed = familyRows.every((r) => r.status === "Served / on file");
    checkedFamilies += 1;

    for (const tab of TABS) {
      const text = readTab(caseDir, tab);
      if (!text) continue;

      for (const line of sentences(text)) {
        if (!family.re.test(line)) continue;
        if (CONDITIONAL_RE.test(line) || UPLOAD_NOISE_RE.test(line) || GUARD_RE.test(line)) continue;

        const claimsServed = SERVED_CLAIM_RE.test(line) && !GAP_CLAIM_RE.test(line);
        const claimsGap = GAP_CLAIM_RE.test(line) && !SERVED_CLAIM_RE.test(line);

        if (claimsServed && !anyServed) {
          findings.push({
            kind: "UPGRADE",
            case: caseName,
            tab,
            family: family.label,
            line,
            papers: familyRows.map((r) => `${r.status}`).join(", "),
          });
        }
        if (claimsGap && allServed) {
          findings.push({
            kind: "DOWNGRADE",
            case: caseName,
            tab,
            family: family.label,
            line,
            papers: familyRows.map((r) => `${r.status}`).join(", "),
          });
        }
      }
    }
  }
}

const byKind = {};
for (const f of findings) {
  const key = `${f.kind}|${f.case}|${f.tab}|${f.family}`;
  if (!byKind[key]) byKind[key] = { ...f, examples: [] };
  if (byKind[key].examples.length < 2) byKind[key].examples.push(f.line);
}

const grouped = Object.values(byKind);
for (const g of grouped) {
  console.log(`\n[${g.kind}] ${g.case}  tab=${g.tab}`);
  console.log(`   family : ${g.family}`);
  console.log(`   papers : ${g.papers}`);
  for (const e of g.examples) console.log(`   says   : ${e.slice(0, 200)}`);
}

console.log("\n================ TOTALS ================");
console.log(`case/family pairs checked : ${checkedFamilies}`);
console.log(`raw contradiction lines   : ${findings.length}`);
console.log(`distinct contradictions   : ${grouped.length}`);
console.log(`  upgrades (gap -> on file): ${grouped.filter((g) => g.kind === "UPGRADE").length}`);
console.log(`  downgrades (served -> gap): ${grouped.filter((g) => g.kind === "DOWNGRADE").length}`);
