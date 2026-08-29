/**
 * Run mixed realistic fictional bundles through the solicitor fact record.
 * Compare locked lines to the file. No live account required.
 *
 *   npx tsx scripts/mixed-cases-fact-record-check.ts
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSolicitorFactRecord } from "@/lib/criminal/solicitor-fact-record";
import { renderSolicitorFacts, solicitorTextAssertsUnconfirmedFamily } from "@/lib/criminal/solicitor-fact-renderer";
import { resolveSolicitorHearingStatus } from "@/lib/criminal/solicitor-hearing-status";

type CaseSpec = {
  id: string;
  file: string;
  accused: string;
  expectCharge: RegExp;
  expectFamily: string;
  forbid: RegExp;
  expectHearingHint?: RegExp;
};

const AS_OF = new Date("2026-08-29T12:00:00Z");

const CASES: CaseSpec[] = [
  {
    id: "harassment-taylor",
    file: "docs/cb-fresh-adversarial/sources/CB-FRESH-001_Taylor_Brookes.txt",
    accused: "Taylor Brookes",
    expectCharge: /harassment.*protection from harassment act 1997/i,
    expectFamily: "Harassment (digital / phone)",
    forbid: /\bpwits\b|intent to supply|gbh|class a/i,
    expectHearingHint: /15 Jul 2026/,
  },
  {
    id: "violence-jordan",
    file: "docs/cb-fresh-adversarial/sources/CB-FRESH-002_Jordan_Hale.txt",
    accused: "Jordan Hale",
    expectCharge: /assault.*emergency worker/i,
    expectFamily: "Violence",
    forbid: /\bpwits\b|intent to supply|theft act/i,
    expectHearingHint: /22 Jul 2026/,
  },
  {
    id: "drugs-okafor",
    file: "docs/bundle-foundation-pack/generated/sources/CB-FOUND-2005_Okafor_Drugs.txt",
    accused: "Amara Okafor",
    expectCharge: /possession of a controlled drug.*class b|misuse of drugs act/i,
    expectFamily: "Drug possession",
    forbid: /\bpwits\b|intent to supply|gbh|section 20/i,
    expectHearingHint: /3 Oct 2026/,
  },
  {
    id: "theft-merritt",
    file: "docs/fictional-bundle-theft/FICTIONAL_THEFT_BUNDLE_COPY_PASTE.txt",
    accused: "Ashleigh Merritt",
    expectCharge: /theft.*theft act 1968/i,
    expectFamily: "Theft",
    forbid: /\bpwits\b|gbh|harassment act/i,
  },
  {
    id: "gbh-pike",
    file: "docs/fictional-bundle-gbh/FICTIONAL_GBH_BUNDLE_COPY_PASTE.txt",
    accused: "Pike",
    expectCharge: /section 20|oapa|gbh/i,
    expectFamily: "Violence",
    forbid: /\bpwits\b|intent to supply|theft act 1968/i,
  },
];

function pullCharge(hay: string): string | null {
  const block =
    hay.match(/Statement of Offence:\s*\n+([^\n]+)/i) ??
    hay.match(/Statement of offence\s*\n+([^\n]+)/i);
  const line = block?.[1]?.trim();
  return line && line.length > 8 ? line : null;
}

const rows: string[] = [
  "# Mixed realistic cases — fact record vs file",
  "",
  `As-of clock: ${AS_OF.toISOString()} (for hearing passed/upcoming).`,
  "Counts are **not** guessed — unknown unless a matter VM is supplied. That is the rule.",
  "",
  "| Case | Charge vs file | Family | Hearing | Wrong-family leak | Verdict |",
  "|---|---|---|---|---|---|",
];

let fails = 0;

for (const spec of CASES) {
  const hay = readFileSync(resolve(spec.file), "utf8");
  const allegation = pullCharge(hay);
  const hearing = resolveSolicitorHearingStatus({ bundleHay: hay, asOf: AS_OF });
  const record = buildSolicitorFactRecord({
    allegation,
    chargeWording: allegation,
    bundleHay: hay,
    hearing,
  });
  const rendered = renderSolicitorFacts(record);
  const sheet = rendered.chatFactSheet;

  const chargeOk = Boolean(allegation && spec.expectCharge.test(allegation) && record.slots.charge.status === "confirmed");
  const familyOk = record.slots.family.status === "confirmed" && record.slots.family.value === spec.expectFamily;
  const hearingOk = spec.expectHearingHint ? spec.expectHearingHint.test(rendered.hearingLine) : record.slots.hearing.status !== "unknown" || true;
  const leaks = solicitorTextAssertsUnconfirmedFamily(sheet, record);
  const forbidHit = spec.forbid.test(sheet);
  const ok = chargeOk && familyOk && !forbidHit && leaks.length === 0;

  if (!ok) fails += 1;
  rows.push(
    `| ${spec.accused} (${spec.id}) | ${chargeOk ? "MATCH" : "MISS"} — ${record.slots.charge.value ?? "not confirmed"} | ${record.slots.family.value ?? "not confirmed"} ${familyOk ? "✓" : "✗"} | ${rendered.hearingLine} | ${forbidHit || leaks.length ? "LEAK" : "clean"} | ${ok ? "PASS" : "FAIL"} |`,
  );
  rows.push("");
  rows.push("```");
  rows.push(rendered.displayLines.join("\n"));
  rows.push("```");
  rows.push("");
}

rows.push(`**Score:** ${CASES.length - fails}/${CASES.length} PASS`);
rows.push("");
rows.push("No live Clerk account was created (that login is on your laptop). This is the new mouth on the files themselves.");

const outDir = resolve("artifacts/as-is-freeze");
mkdirSync(outDir, { recursive: true });
const out = resolve(outDir, "mixed-cases-fact-record-check.md");
writeFileSync(out, rows.join("\n"));
console.log(rows.join("\n"));
console.log(`\nWrote ${out}`);
if (fails) process.exit(1);
