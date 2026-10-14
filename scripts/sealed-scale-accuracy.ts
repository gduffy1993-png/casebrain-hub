#!/usr/bin/env npx tsx
/**
 * Sealed scale accuracy: original PDF bytes → live extract → canonical surfaces.
 * Truth is not passed into extractors or builders. Score after freeze.
 *
 *   npx tsx scripts/sealed-scale-accuracy.ts --n 200
 *   npx tsx scripts/sealed-scale-accuracy.ts --n 30000 --batch 500
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractTextAndMetaFromFileBuffer } from "../lib/upload/extract-text-from-file";
import { toPersistedPageUnits } from "../lib/upload/pdf-page-units";
import { composeAuthenticatedBundleSourceWithCanonical } from "../lib/criminal/authenticated-matter-canonical";
import { buildBundleSourcePayload } from "../lib/bundle/parse-bundle-display";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "artifacts", "sealed-scale");
const nArg = Number(process.argv.find((a, i) => process.argv[i - 1] === "--n") ?? "200");
const batchArg = Number(process.argv.find((a, i) => process.argv[i - 1] === "--batch") ?? "250");
const N = Number.isFinite(nArg) && nArg > 0 ? Math.floor(nArg) : 200;
const BATCH = Number.isFinite(batchArg) && batchArg > 0 ? Math.floor(batchArg) : 250;
const GATE = 0.9;

const FIRST = [
  "Aaron", "Amira", "Callum", "Chloe", "Daniel", "Elena", "Farhan", "Grace", "Hassan", "Isla",
  "Jamie", "Kian", "Layla", "Marcus", "Nadia", "Omar", "Priya", "Quinn", "Rosa", "Sami",
  "Tariq", "Uma", "Victor", "Willa", "Yasmin", "Zane", "Leon", "Maya", "Noah", "Aisha",
];
const LAST = [
  "Ross", "Nair", "Doyle", "Hale", "Patel", "Grant", "Brookes", "Vale", "Reed", "Marsh",
  "Carter", "Bell", "Dunn", "Ahmed", "Davies", "Patterson", "Greene", "Clarke", "Hughes", "Khan",
  "Walsh", "Owen", "Singh", "Flynn", "Norris", "Quinn", "Yates", "Bishop", "Hart", "Frost",
  "McGrath", "ONeill", "Alvarez", "Bennett", "Collins", "Fraser",
];
const COURTS = [
  "Northchester Magistrates' Court",
  "Northbridge Magistrates' Court",
  "Southwark Crown Court",
  "Manchester Crown Court",
  "Leeds Magistrates' Court",
];
const OFFENCES = [
  { charge: "Theft", contrary: "contrary to section 1 Theft Act 1968", re: /\btheft\b/i },
  { charge: "Robbery", contrary: "contrary to section 8 Theft Act 1968", re: /\brobbery\b/i },
  { charge: "Burglary", contrary: "contrary to section 9 Theft Act 1968", re: /\bburglary\b/i },
  { charge: "Assault by beating", contrary: "contrary to section 39 Criminal Justice Act 1988", re: /assault by beating|\bbattery\b/i },
  { charge: "Affray", contrary: "contrary to section 3 Public Order Act 1986", re: /\baffray\b/i },
  { charge: "Harassment", contrary: "contrary to section 2 Protection from Harassment Act 1997", re: /\bharassment\b/i },
  { charge: "Murder, contrary to common law", contrary: "", re: /\bmurder\b/i },
  {
    charge: "Possession with intent to supply Class A controlled drugs",
    contrary: "contrary to section 5(3) Misuse of Drugs Act 1971",
    re: /possession with intent|class a|pwits/i,
  },
  {
    charge: "Assault occasioning actual bodily harm",
    contrary: "contrary to section 47 Offences Against the Person Act 1861",
    re: /actual bodily harm|\babh\b|section 47/i,
  },
  {
    charge: "Criminal damage",
    contrary: "contrary to section 1 Criminal Damage Act 1971",
    re: /criminal damage/i,
  },
] as const;
const WITNESSES = ["Casey Lane", "Mason Reed", "PC Lewis Hall", "Jordan Chase", "Riley Shah"];
const GAPS = ["none", "cctv", "phone", "both"] as const;

type Spec = {
  id: number;
  defendant: string;
  witness: string;
  charge: string;
  chargeRe: RegExp;
  court: string;
  hearing: string;
  gap: (typeof GAPS)[number];
  layout:
    | "labelled"
    | "offence-heading"
    | "glued"
    | "witness-trap"
    | "suspicion"
    | "rv-only"
    | "statement-of-offence"
    | "slash-date"
    | "co-d"
    | "mg11-first"
    | "the-king"
    | "regina"
    | "r-dot"
    | "accused-label"
    | "person-charged"
    | "mg5-first"
    | "cover-letter-first"
    | "listed"
    | "pwits-short"
    | "all-caps"
    | "hearing-at"
    | "in-the-court";
};

type Observed = {
  id: number;
  defendant: string | null;
  charge: string;
  hearing: string;
  chase: string;
  courtLine: string;
  surfaces: boolean;
  withheld: boolean;
};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)]!;
}

function makeSpec(id: number): Spec {
  const rand = rng(id * 9973 + 17);
  const defendant = `${pick(rand, FIRST)} ${pick(rand, LAST)}`;
  let witness = pick(rand, WITNESSES);
  if (witness === defendant) witness = "Casey Lane";
  const offence = pick(rand, OFFENCES);
  const day = 1 + Math.floor(rand() * 27);
  const month = pick(rand, ["May", "June", "July", "August"]);
  const layouts: Spec["layout"][] = [
    "labelled",
    "offence-heading",
    "glued",
    "witness-trap",
    "suspicion",
    "rv-only",
    "statement-of-offence",
    "slash-date",
    "co-d",
    "mg11-first",
    "the-king",
    "regina",
    "r-dot",
    "accused-label",
    "person-charged",
    "mg5-first",
    "cover-letter-first",
    "listed",
    "pwits-short",
    "all-caps",
    "hearing-at",
    "in-the-court",
  ];
  return {
    id,
    defendant,
    witness,
    charge: offence.charge,
    chargeRe: offence.re,
    court: pick(rand, COURTS),
    hearing: `${day} ${month} 2026 10:00`,
    gap: pick(rand, GAPS),
    layout: pick(rand, layouts),
  };
}

function bundleLines(spec: Spec): string[] {
  const contrary = OFFENCES.find((o) => o.charge === spec.charge)?.contrary ?? "";
  const chargeLine = contrary ? `${spec.charge}, ${contrary}` : spec.charge;
  const gapLines =
    spec.gap === "none"
      ? ["No unused schedule is attached to these papers."]
      : spec.gap === "cctv"
        ? ["CCTV from the store is not served.", "Full CCTV download outstanding."]
        : spec.gap === "phone"
          ? ["Full phone download outstanding."]
          : ["CCTV from the store is not served.", "Full phone download outstanding."];
  if (spec.layout === "labelled") {
    return [
      "PROSECUTION CASE PAPERS",
      `R v ${spec.defendant}`,
      `Defendant: ${spec.defendant}`,
      "CHARGE SHEET AND INITIAL DETAILS",
      `Charge: ${chargeLine}`,
      `Court: ${spec.court}`,
      `Next hearing: ${spec.hearing}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "offence-heading") {
    return [
      "CHARGE SHEET AND INITIAL DETAILS",
      `R v ${spec.defendant}`,
      `Defendant: ${spec.defendant}`,
      "Offence",
      chargeLine,
      `Court: ${spec.court}`,
      `Next hearing: ${spec.hearing}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "glued") {
    return [
      "PROSECUTION CASE PAPERS",
      `R v ${spec.defendant}`,
      `Defendant${spec.defendant}DOB09/09/1999`,
      "CHARGE SHEET AND INITIAL DETAILS",
      `Charge: ${chargeLine}`,
      `Court: ${spec.court}`,
      `Next hearing: ${spec.hearing}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "witness-trap") {
    return [
      "PROSECUTION CASE PAPERS",
      `R v ${spec.defendant}`,
      `Defendant: ${spec.defendant}`,
      "CHARGE SHEET AND INITIAL DETAILS",
      `Charge: ${chargeLine}`,
      `Court: ${spec.court}`,
      `Next hearing: ${spec.hearing}`,
      "MG11 WITNESS STATEMENT",
      `Statement of ${spec.witness}`,
      `Witness: ${spec.witness}`,
      `I saw a male leave the shop. ${spec.witness} is not the defendant.`,
      ...gapLines,
    ];
  }
  if (spec.layout === "rv-only") {
    return [
      "PROSECUTION CASE PAPERS",
      `THE QUEEN v ${spec.defendant}`,
      "CHARGE SHEET AND INITIAL DETAILS",
      `Charge: ${chargeLine}`,
      `Court: ${spec.court}`,
      `Next hearing: ${spec.hearing}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "statement-of-offence") {
    return [
      "INDICTMENT",
      `R v ${spec.defendant}`,
      `Defendant: ${spec.defendant}`,
      "Count 1",
      "Statement of Offence",
      chargeLine,
      "Particulars of Offence",
      `${spec.defendant} on 1 January 2026 ${spec.charge.toLowerCase()} as charged on this indictment.`,
      `Court: ${spec.court}`,
      `Next hearing: ${spec.hearing}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "slash-date") {
    const slash = spec.hearing
      .replace(" May ", "/05/")
      .replace(" June ", "/06/")
      .replace(" July ", "/07/")
      .replace(" August ", "/08/")
      .replace(" 2026 ", "/2026 ");
    return [
      "PROSECUTION CASE PAPERS",
      `R v ${spec.defendant}`,
      `Defendant: ${spec.defendant}`,
      `Charge: ${chargeLine}`,
      `Court: ${spec.court}`,
      `Next hearing: ${slash}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "co-d") {
    return [
      "PROSECUTION CASE PAPERS",
      `R v ${spec.defendant} and ${spec.witness}`,
      `Defendant: ${spec.defendant}`,
      "Co-defendant named for listing only. Do not treat the co-defendant as this client.",
      `Charge: ${chargeLine}`,
      `Court: ${spec.court}`,
      `Next hearing: ${spec.hearing}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "mg11-first") {
    return [
      "MG11 WITNESS STATEMENT",
      `Statement of ${spec.witness}`,
      `Witness: ${spec.witness}`,
      "I attended the scene. I am a witness, not the accused.",
      "CHARGE SHEET AND INITIAL DETAILS",
      `R v ${spec.defendant}`,
      `Defendant: ${spec.defendant}`,
      `Charge: ${chargeLine}`,
      `Court: ${spec.court}`,
      `Next hearing: ${spec.hearing}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "the-king") {
    return [
      "PROSECUTION CASE PAPERS",
      `THE KING v. ${spec.defendant}`,
      "CHARGE SHEET AND INITIAL DETAILS",
      `Charge: ${chargeLine}`,
      `Court: ${spec.court}`,
      `Next hearing: ${spec.hearing}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "regina") {
    return [
      "INDICTMENT",
      `Regina v ${spec.defendant}`,
      "CHARGE SHEET AND INITIAL DETAILS",
      `Charge: ${chargeLine}`,
      `Court: ${spec.court}`,
      `Next hearing: ${spec.hearing}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "r-dot") {
    return [
      "PROSECUTION CASE PAPERS",
      `R. v. ${spec.defendant}`,
      "CHARGE SHEET AND INITIAL DETAILS",
      `Charge: ${chargeLine}`,
      `Court: ${spec.court}`,
      `Next hearing: ${spec.hearing}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "accused-label") {
    return [
      "CHARGE SHEET AND INITIAL DETAILS",
      `Accused: ${spec.defendant}`,
      `Charge: ${chargeLine}`,
      `Court: ${spec.court}`,
      `Next hearing: ${spec.hearing}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "person-charged") {
    return [
      "CHARGE SHEET AND INITIAL DETAILS",
      `Person charged: ${spec.defendant}`,
      `Charge: ${chargeLine}`,
      `Court: ${spec.court}`,
      `Next hearing: ${spec.hearing}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "mg5-first") {
    return [
      "MG5 CASE SUMMARY",
      `Police allege ${spec.defendant} was involved. That narrative is not the charge sheet.`,
      `Witness ${spec.witness} attended.`,
      "CHARGE SHEET AND INITIAL DETAILS",
      `R v ${spec.defendant}`,
      `Defendant: ${spec.defendant}`,
      `Charge: ${chargeLine}`,
      `Court: ${spec.court}`,
      `Next hearing: ${spec.hearing}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "cover-letter-first") {
    return [
      "COVERING LETTER",
      "Please find enclosed the initial details of the prosecution case.",
      `The papers concern ${spec.defendant}.`,
      "---PAGE---",
      "CHARGE SHEET AND INITIAL DETAILS",
      `R v ${spec.defendant}`,
      `Defendant: ${spec.defendant}`,
      `Charge: ${chargeLine}`,
      `Court: ${spec.court}`,
      `Next hearing: ${spec.hearing}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "listed") {
    const slash = spec.hearing
      .replace(" May ", "/05/")
      .replace(" June ", "/06/")
      .replace(" July ", "/07/")
      .replace(" August ", "/08/")
      .replace(" 2026 ", "/2026 ");
    return [
      "PROSECUTION CASE PAPERS",
      `R v ${spec.defendant}`,
      `Defendant: ${spec.defendant}`,
      `Charge: ${chargeLine}`,
      `Court: ${spec.court}`,
      `Listed: ${slash}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "pwits-short") {
    const pwitsLine =
      spec.charge === "Possession with intent to supply Class A controlled drugs"
        ? "PWITS Class A, contrary to section 5(3) Misuse of Drugs Act 1971"
        : chargeLine;
    return [
      "CHARGE SHEET AND INITIAL DETAILS",
      `R v ${spec.defendant}`,
      `Defendant: ${spec.defendant}`,
      `Charge: ${pwitsLine}`,
      `Court: ${spec.court}`,
      `Next hearing: ${spec.hearing}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "all-caps") {
    return [
      "PROSECUTION CASE PAPERS",
      `R v ${spec.defendant.toUpperCase()}`,
      `Defendant: ${spec.defendant.toUpperCase()}`,
      "CHARGE SHEET AND INITIAL DETAILS",
      `Charge: ${chargeLine}`,
      `Court: ${spec.court}`,
      `Next hearing: ${spec.hearing}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "hearing-at") {
    return [
      "PROSECUTION CASE PAPERS",
      `R v ${spec.defendant}`,
      `Defendant: ${spec.defendant}`,
      "CHARGE SHEET AND INITIAL DETAILS",
      `Charge: ${chargeLine}`,
      `Court: ${spec.court}`,
      `Next hearing: ${spec.hearing.replace(" 10:00", " at 10:00")}`,
      ...gapLines,
    ];
  }
  if (spec.layout === "in-the-court") {
    return [
      `IN THE ${spec.court.toUpperCase()}`,
      `R v ${spec.defendant}`,
      `Defendant: ${spec.defendant}`,
      "CHARGE SHEET AND INITIAL DETAILS",
      `Charge: ${chargeLine}`,
      `Next hearing: ${spec.hearing}`,
      ...gapLines,
    ];
  }
  return [
    "PROSECUTION CASE PAPERS",
    `R v ${spec.defendant}`,
    `Defendant: ${spec.defendant}`,
    "CHARGE SHEET AND INITIAL DETAILS",
    `Charge: ${chargeLine}`,
    `Court: ${spec.court}`,
    `Next hearing: ${spec.hearing}`,
    "The male was arrested on suspicion of burglary. That suspicion is not the charge on this sheet.",
    ...gapLines,
  ];
}

async function pdfFromLines(lines: string[]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  let page = pdf.addPage([595, 842]);
  let y = 800;
  for (const line of lines) {
    if (line === "---PAGE---" || y < 60) {
      page = pdf.addPage([595, 842]);
      y = 800;
      if (line === "---PAGE---") continue;
    }
    page.drawText(line.slice(0, 110), { x: 48, y, size: 11, font });
    y -= 16;
  }
  return Buffer.from(await pdf.save());
}

function norm(s: string | null | undefined) {
  return (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

async function runOne(spec: Spec, withSurfaces: boolean): Promise<Observed> {
  const bytes = await pdfFromLines(bundleLines(spec));
  const extracted = await extractTextAndMetaFromFileBuffer(`scale-${spec.id}.pdf`, "application/pdf", bytes);
  const docs = [
    {
      id: `scale-${spec.id}`,
      name: `scale-${spec.id}.pdf`,
      raw_text: extracted.text,
      extracted_text: extracted.text,
      extracted_json: {
        pages: toPersistedPageUnits(extracted.pageUnits),
        ingestionAssessment: extracted.ingestionAssessment,
      },
    },
  ];
  const payload = buildBundleSourcePayload(docs);
  const api = composeAuthenticatedBundleSourceWithCanonical(docs, {
    caseId: `scale-${spec.id}`,
    allegation: payload.caseMetadata?.offenceDisplay ?? null,
    withSurfaces,
  });
  const charge = [
    ...(api.canonical.charges ?? []).map((c) => [c.offence, c.particulars].filter(Boolean).join(" ")),
    payload.caseMetadata?.offenceDisplay,
    payload.caseMetadata?.offenceWording,
  ]
    .filter(Boolean)
    .join(" | ");
  const hearing = [
    api.canonical.hearingLifecycle?.latest?.hearingDateRaw,
    payload.caseMetadata?.nextHearingRaw,
    payload.caseMetadata?.court,
  ]
    .filter(Boolean)
    .join(" | ");
  const chase = [
    ...(api.canonical.chaseLabels ?? []),
    ...((api.surfaces?.disclosureChase?.primaryItems ?? []).map((i: { label?: string }) => i.label ?? "")),
  ].join(" | ");
  return {
    id: spec.id,
    defendant: payload.caseMetadata?.defendantName ?? null,
    charge,
    hearing,
    chase,
    courtLine: api.surfaces?.composedProse?.courtLine ?? "",
    surfaces: Boolean(api.surfaces?.disclosureChase && api.surfaces?.warRoom),
    withheld: Boolean(api.canonical.ingestion?.substantiveOutputsWithheld),
  };
}

function score(spec: Spec, got: Observed) {
  const fail: string[] = [];
  if (got.withheld) fail.push("withheld");
  const gotDef = norm(got.defendant);
  const wantDef = norm(spec.defendant);
  if (!gotDef || (gotDef !== wantDef && !gotDef.includes(wantDef) && !wantDef.includes(gotDef))) {
    fail.push(`defendant:${got.defendant ?? "missing"}`);
  }
  if (gotDef && gotDef === norm(spec.witness)) fail.push(`witness_bleed:${got.defendant}`);
  if (!spec.chargeRe.test(got.charge)) fail.push(`charge:${got.charge.slice(0, 80) || "missing"}`);
  if (spec.layout === "suspicion" && /\bburglary\b/i.test(got.charge) && spec.charge !== "Burglary") {
    fail.push("suspicion_over_charge");
  }
  if (!norm(got.hearing).includes(norm(spec.hearing).split(" ")[0] ?? "") && !norm(got.hearing).includes(norm(spec.court).slice(0, 8))) {
    fail.push(`hearing:${got.hearing.slice(0, 80) || "missing"}`);
  }
  const chaseN = norm(got.chase);
  if (spec.gap === "none" && (/\bcctv\b/.test(chaseN) || /\bphone download\b/.test(chaseN))) {
    fail.push("invented_gap");
  }
  if ((spec.gap === "cctv" || spec.gap === "both") && got.surfaces && !/\bcctv\b/.test(chaseN)) {
    fail.push("missed_cctv");
  }
  if ((spec.gap === "phone" || spec.gap === "both") && got.surfaces && !/\bphone\b/.test(chaseN)) {
    fail.push("missed_phone");
  }
  if (got.courtLine && /\b(guilty|convicted|plea of guilty)\b/i.test(got.courtLine)) {
    fail.push("overclaim_court");
  }
  return fail;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const fails: Array<{ id: number; layout: string; fail: string[] }> = [];
  let passed = 0;
  const t0 = Date.now();
  for (let start = 0; start < N; start += BATCH) {
    const end = Math.min(N, start + BATCH);
    for (let id = start; id < end; id++) {
      const spec = makeSpec(id);
      const withSurfaces = N <= 2000 ? id < N : id < 400 || id % 25 === 0;
      const got = await runOne(spec, withSurfaces);
      const fail = score(spec, got);
      if (fail.length) fails.push({ id, layout: spec.layout, fail });
      else passed += 1;
    }
    const done = end;
    const acc = passed / done;
    console.log(`progress ${done}/${N} accuracy=${(acc * 100).toFixed(2)}% fails=${fails.length}`);
    const midByReason: Record<string, number> = {};
    for (const row of fails) {
      for (const f of row.fail) {
        const key = f.split(":")[0]!;
        midByReason[key] = (midByReason[key] ?? 0) + 1;
      }
    }
    fs.writeFileSync(
      path.join(OUT, "SCORE.json"),
      JSON.stringify(
        {
          n: done,
          target: N,
          passed,
          failed: fails.length,
          accuracy: acc,
          gate: acc >= GATE ? "sealed-scale-holds" : "sealed-scale-fails",
          required: GATE,
          elapsedMs: Date.now() - t0,
          byReason: midByReason,
          sampleFails: fails.slice(0, 40),
        },
        null,
        2,
      ),
    );
  }
  const accuracy = passed / N;
  const byReason: Record<string, number> = {};
  for (const row of fails) {
    for (const f of row.fail) {
      const key = f.split(":")[0]!;
      byReason[key] = (byReason[key] ?? 0) + 1;
    }
  }
  const report = {
    n: N,
    passed,
    failed: fails.length,
    accuracy,
    gate: accuracy >= GATE ? "sealed-scale-holds" : "sealed-scale-fails",
    required: GATE,
    elapsedMs: Date.now() - t0,
    byReason,
    sampleFails: fails.slice(0, 40),
    candidateSha256: createHash("sha256").update(JSON.stringify({ n: N, passed, fails: fails.length })).digest("hex"),
  };
  fs.writeFileSync(path.join(OUT, "SCORE.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, "FAILS.json"), JSON.stringify(fails, null, 2));
  console.log(JSON.stringify({ gate: report.gate, accuracy: report.accuracy, failed: report.failed, byReason }, null, 2));
  if (accuracy < GATE) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
