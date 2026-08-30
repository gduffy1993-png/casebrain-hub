/**
 * Every solicitor-fact output vs the source file (the PDF text).
 * Charge / hearing must match the papers. Counts stay unknown without a VM.
 * A DOB must never appear as the hearing.
 *
 *   npx tsx scripts/every-output-vs-pdf-check.ts
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildSolicitorFactRecord } from "@/lib/criminal/solicitor-fact-record";
import { renderSolicitorFacts, solicitorTextAssertsUnconfirmedFamily } from "@/lib/criminal/solicitor-fact-renderer";
import { resolveSolicitorHearingStatus } from "@/lib/criminal/solicitor-hearing-status";
import {
  collectDobHearingPoisonIsos,
  labelledHearingIsoFromHay,
} from "@/lib/criminal/solicitor-hearing-display";
import { extractBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";

const AS_OF = new Date("2026-08-29T12:00:00Z");
const ROOT = process.cwd();

const DIRS = [
  "docs/cb-fresh-adversarial/sources",
  "docs/bundle-foundation-pack/generated/sources",
  "docs/fictional-bundle-theft",
  "docs/fictional-bundle-gbh",
  "docs/fictional-cases-40",
];

type Row = {
  file: string;
  chargeOnFile: string;
  chargeOut: string;
  chargeOk: boolean;
  hearingOnFile: string;
  hearingOut: string;
  hearingOk: boolean;
  countsOk: boolean;
  leak: boolean;
  dobAsHearing: boolean;
  verdict: "PASS" | "FAIL";
  notes: string[];
};

function listTxt(dir: string): string[] {
  const abs = join(ROOT, dir);
  try {
    return readdirSync(abs)
      .filter((n) => n.endsWith(".txt") && !/^MASTER/i.test(n))
      .map((n) => join(dir, n))
      .sort();
  } catch {
    return [];
  }
}

function pullCharge(hay: string): string | null {
  const block =
    hay.match(/Statement of Offence:\s*\n+([^\n]+)/i) ??
    hay.match(/Statement of offence\s*\n+([^\n]+)/i) ??
    hay.match(/Offence\(s\) as tag:\s*([^\n]+)/i) ??
    hay.match(/Short title:\s*([^\n]+)/i);
  const line = block?.[1]?.trim().replace(/\s+\(fictional charge drafting for test data\)\.?$/i, "");
  return line && line.length > 4 ? line : null;
}

function familyCueOnFile(hay: string, family: string | null): boolean {
  if (!family) return true;
  const h = hay.toLowerCase();
  if (family === "Violence") return /assault|gbh|abh|wounding|robbery|s\.?\s*1[478]|s\.?\s*20|s\.?\s*39|violence|emergency worker/i.test(h);
  if (family === "Theft") return /\btheft\b|burglary|dishonest/i.test(h);
  if (family === "Drug possession") return /possession|class [ab]|misuse of drugs/i.test(h) && !/\bpwits\b|intent to supply/i.test(h);
  if (family === "Drug supply / PWITS") return /\bpwits\b|intent to supply/i.test(h);
  if (family.startsWith("Harassment")) return /harassment|stalking/i.test(h);
  if (family === "Motoring") return /road traffic|drink|breath|driving|motoring/i.test(h);
  return true;
}

const rows: Row[] = [];

for (const file of DIRS.flatMap(listTxt)) {
  const hay = readFileSync(resolve(file), "utf8");
  const chargeOnFile = pullCharge(hay);
  const labelled = labelledHearingIsoFromHay(hay);
  const dobs = collectDobHearingPoisonIsos(hay);
  const hearing = resolveSolicitorHearingStatus({ bundleHay: hay, asOf: AS_OF });
  const record = buildSolicitorFactRecord({
    allegation: chargeOnFile,
    chargeWording: chargeOnFile,
    bundleHay: hay,
    hearing,
  });
  const rendered = renderSolicitorFacts(record);
  const notes: string[] = [];

  const chargeOk = chargeOnFile
    ? record.slots.charge.status === "confirmed" &&
      Boolean(record.slots.charge.value && chargeOnFile.toLowerCase().includes(record.slots.charge.value.slice(0, 24).toLowerCase()) ||
        record.slots.charge.value?.toLowerCase().includes(chargeOnFile.slice(0, 24).toLowerCase()))
    : record.slots.charge.status === "unknown";

  const hearingOk = labelled
    ? hearing.dateIso === labelled && record.slots.hearing.status === "confirmed"
    : record.slots.hearing.status === "unknown" && hearing.kind === "unknown";

  const extracted = extractBundleCaseMetadata(hay);
  const extractedDay = extracted.nextHearingIso?.slice(0, 10) ?? null;
  if (extractedDay && dobs.has(extractedDay)) {
    notes.push("extractor still stored a DOB");
  }
  if (
    labelled &&
    extractedDay &&
    extractedDay !== labelled &&
    extractedDay !== "2026-01-01" &&
    extractedDay !== "2025-01-01"
  ) {
    notes.push(`extractor iso ${extractedDay} vs listing ${labelled}`);
  }

  const dobAsHearing =
    Boolean(hearing.dateIso && dobs.has(hearing.dateIso)) ||
    [...dobs].some((iso) => {
      const y = iso.slice(0, 4);
      return y < "2015" && rendered.hearingLine.includes(y);
    });

  const countsOk =
    record.slots.evidenceServed.status === "unknown" &&
    record.slots.chaseTotal.status === "unknown" &&
    record.slots.mg11.status === "unknown";

  const leaks = solicitorTextAssertsUnconfirmedFamily(rendered.chatFactSheet, record);
  const family = record.slots.family.value;
  const familyOk = familyCueOnFile(hay, family);
  if (!familyOk) notes.push(`family ${family} not cued on file`);

  const leak = leaks.length > 0;
  const ok = chargeOk && hearingOk && countsOk && !dobAsHearing && !leak && familyOk && notes.length === 0;
  rows.push({
    file,
    chargeOnFile: chargeOnFile ?? "—",
    chargeOut: record.slots.charge.value ?? "not confirmed",
    chargeOk,
    hearingOnFile: labelled ?? "no listing on file",
    hearingOut: rendered.hearingLine,
    hearingOk,
    countsOk,
    leak,
    dobAsHearing,
    verdict: ok ? "PASS" : "FAIL",
    notes,
  });
}

const pass = rows.filter((r) => r.verdict === "PASS").length;
const fail = rows.filter((r) => r.verdict === "FAIL");
const lines = [
  "# Every output vs source PDF text",
  "",
  `As-of: ${AS_OF.toISOString()}`,
  `Files: ${rows.length}. Score: **${pass}/${rows.length} PASS**.`,
  "",
  "Rule: charge matches the charge sheet/tag. Hearing matches a labelled listing, or is not confirmed. Counts/MG11 stay unknown. A DOB is never a hearing.",
  "",
  "| File | Charge | Hearing | Counts | DOB-as-hearing | Leak | Verdict | Notes |",
  "|---|---|---|---|---|---|---|---|",
];
for (const r of rows) {
  lines.push(
    `| ${r.file.replace(/^docs\//, "")} | ${r.chargeOk ? "MATCH" : "MISS"} | ${r.hearingOk ? "MATCH" : "MISS"} | ${r.countsOk ? "unknown✓" : "invented"} | ${r.dobAsHearing ? "YES" : "no"} | ${r.leak ? "LEAK" : "clean"} | ${r.verdict} | ${r.notes.join("; ") || "—"} |`,
  );
}
if (fail.length) {
  lines.push("", "## Failures", "");
  for (const r of fail) {
    lines.push(`### ${r.file}`);
    lines.push("");
    lines.push(`- File charge: ${r.chargeOnFile}`);
    lines.push(`- Output charge: ${r.chargeOut}`);
    lines.push(`- File hearing: ${r.hearingOnFile}`);
    lines.push(`- Output hearing: ${r.hearingOut}`);
    lines.push(`- Notes: ${r.notes.join("; ") || "—"}`);
    lines.push("");
  }
}

const out = resolve("artifacts/as-is-freeze/every-output-vs-pdf-check.md");
mkdirSync(resolve("artifacts/as-is-freeze"), { recursive: true });
writeFileSync(out, lines.join("\n"));
console.log(lines.join("\n"));
console.log(`\nWrote ${out}`);
if (fail.length) process.exitCode = 1;
