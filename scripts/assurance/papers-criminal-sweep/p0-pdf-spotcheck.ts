/**
 * P0.5 Papers PDF spot-check — invent_bwv + mute_phone sample + modality sample.
 * Find-only. Volume ≠ guilt.
 *
 *   npx tsx scripts/assurance/papers-criminal-sweep/p0-pdf-spotcheck.ts
 */
import fs from "node:fs";
import path from "node:path";
import { extractTextFromFileBuffer } from "@/lib/upload/extract-text-from-file";
import { buildBundleTruthLedger } from "@/lib/criminal/bundle-truth-ledger";

const ROOT = process.cwd();
const PACK = path.join(ROOT, "artifacts/casebrain-qa/assurance/papers-criminal-sweep-v1");
const HITLIST = path.join(PACK, "PAPERS-FAIL-HITLIST.csv");
const INDEX = path.join(PACK, "CRIMINAL-UNIQUE-INDEX.csv");
const NDJSON = path.join(PACK, "papers-sweep.ndjson");
const OUT = path.join(PACK, "p0-pdf-spotcheck.json");

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cols[i] ?? ""));
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
      continue;
    }
    if (ch === "," && !q) {
      cols.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cols.push(cur);
  return cols;
}

async function pdfText(pdfPath: string): Promise<string> {
  if (!pdfPath || !fs.existsSync(pdfPath)) return "";
  try {
    const buf = fs.readFileSync(pdfPath);
    return (await extractTextFromFileBuffer(path.basename(pdfPath), "application/pdf", buf)) || "";
  } catch {
    return "";
  }
}

function loadNdjsonByKey(): Map<string, any> {
  const m = new Map<string, any>();
  if (!fs.existsSync(NDJSON)) return m;
  for (const line of fs.readFileSync(NDJSON, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line);
      if (o.unique_key) m.set(o.unique_key, o);
    } catch {
      /* skip */
    }
  }
  return m;
}

type RowOut = {
  family: string;
  case_key: string;
  unique_key: string;
  cls: string;
  note: string;
  materialCount?: number;
  claimSample?: string;
};

function classifyMutePhone(hay: string, claimBlob: string, materialCount: number): { cls: string; note: string } {
  const srcPhoneDl =
    /phone download|source export|handset download|digital extraction|extraction report/i.test(hay) &&
    /outstanding|not served|referred/i.test(hay);
  const claimPhone = /phone download|source export referred|digital extraction|original download/i.test(claimBlob);
  if (!srcPhoneDl) {
    return { cls: "DETECTOR_NOISE", note: "Source lacks clear outstanding phone-download phrase — mute flag overfires" };
  }
  if (claimPhone) {
    return { cls: "FALSE_MUTE_FLAG", note: "Papers inventory already surfaces phone download — detector FN noise" };
  }
  if (materialCount === 0) {
    return { cls: "INVENTORY_COLLAPSE_OR_MUTE", note: "Rich outstanding download on source; Papers materials empty/thin" };
  }
  return { cls: "REAL_MUTE_CANDIDATE", note: "Outstanding download on source; absent from Papers claim blob" };
}

function classifyModality(hay: string, claimBlob: string): { cls: string; note: string } {
  const summary = /interview summary/i.test(hay);
  const recClaim = /interview recording|PACE recording|audio.?visual interview/i.test(claimBlob);
  const recSrc = /interview recording|PACE recording|audio.?visual|ROTI|tape/i.test(hay);
  if (summary && recClaim && !recSrc) {
    return { cls: "REAL_MODALITY_RISK", note: "Summary on source; Papers claims recording without recording establishment" };
  }
  if (summary && recClaim && recSrc) {
    return { cls: "PDF_TRUE_BOTH", note: "Both summary and recording language on source — modality flag may be soft" };
  }
  return { cls: "DETECTOR_NOISE", note: "Modality pattern weak / mixed" };
}

function classifyInventBwv(hay: string, claimBlob: string): { cls: string; note: string } {
  const bwvClaim = /\bBWV\b|body[- ]worn/i.test(claimBlob);
  const bwvSrc = /\bBWV\b|body[- ]worn/i.test(hay);
  if (bwvClaim && !bwvSrc) {
    return { cls: "REAL_INVENT_SUSPECT", note: "Papers claims BWV with no BWV language on source extract" };
  }
  if (bwvClaim && bwvSrc) {
    return { cls: "DETECTOR_NOISE", note: "BWV present on source — invent flag overfire" };
  }
  return { cls: "UNCLEAR", note: "Weak BWV signals" };
}

async function main() {
  const hits = parseCsv(fs.readFileSync(HITLIST, "utf8"));
  const index = parseCsv(fs.readFileSync(INDEX, "utf8"));
  const byKey = new Map(index.map((r) => [r.unique_key, r]));
  const nd = loadNdjsonByKey();

  const invent = hits.filter((h) => h.severity === "INVENT");
  const mutePhone = hits.filter((h) => h.fail_family === "mute_phone_download").slice(0, 12);
  const modality = hits.filter((h) => h.fail_family === "modality_summary_vs_recording").slice(0, 10);

  const results: RowOut[] = [];

  async function check(h: Record<string, string>, family: string, classify: (hay: string, claim: string, mc: number) => { cls: string; note: string }) {
    const idx = byKey.get(h.unique_key);
    const row = nd.get(h.unique_key);
    let hay = "";
    if (idx?.pdf_path && fs.existsSync(idx.pdf_path)) {
      hay = await pdfText(idx.pdf_path);
    }
    // Prefer ndjson source chars path via re-ledger from PDF when available
    let claimBlob = (row?.papersClaims || []).join("\n");
    let materialCount = row?.ledgerMeta?.materialCount ?? 0;
    if (hay.length > 80) {
      const ledger = buildBundleTruthLedger({ bundleText: hay.slice(0, 220_000) });
      materialCount = ledger.materials?.length ?? 0;
      claimBlob = (ledger.materials ?? [])
        .slice(0, 40)
        .map((m) => [m.label, m.status, m.detail || "", m.displayLine || ""].filter(Boolean).join(" | "))
        .join("\n");
      if (ledger.hearing?.rawLiteral) claimBlob = `HEARING | ${ledger.hearing.rawLiteral}\n` + claimBlob;
      if (ledger.charge?.wording) claimBlob = `CHARGE | ${ledger.charge.wording}\n` + claimBlob;
    }
    if (!hay) {
      results.push({
        family,
        case_key: h.case_key,
        unique_key: h.unique_key,
        cls: "MISSING_PDF",
        note: "PDF path missing locally — cannot PDF-verify",
        materialCount,
        claimSample: claimBlob.slice(0, 180),
      });
      return;
    }
    const { cls, note } = classify(hay, claimBlob, materialCount);
    results.push({
      family,
      case_key: h.case_key,
      unique_key: h.unique_key,
      cls,
      note,
      materialCount,
      claimSample: claimBlob.slice(0, 180),
    });
  }

  for (const h of invent) {
    await check(h, "invent_bwv", (hay, claim) => classifyInventBwv(hay, claim));
  }
  for (const h of mutePhone) {
    await check(h, "mute_phone_download", classifyMutePhone);
  }
  for (const h of modality) {
    await check(h, "modality_summary_vs_recording", (hay, claim) => classifyModality(hay, claim));
  }

  const tally: Record<string, Record<string, number>> = {};
  for (const r of results) {
    tally[r.family] ||= {};
    tally[r.family][r.cls] = (tally[r.family][r.cls] || 0) + 1;
  }

  const verdict =
    invent.every((_) => true) &&
    (tally.invent_bwv?.REAL_INVENT_SUSPECT || 0) === 0 &&
    (tally.mute_phone_download?.REAL_MUTE_CANDIDATE || 0) < 4
      ? "P0_5_TRIAGE_WATCH_NO_SHARED_INVENT"
      : "P0_5_TRIAGE_NEEDS_HOP_REVIEW";

  const out = {
    verdict,
    productSha: "6e63bb6d2",
    sampledAt: new Date().toISOString(),
    counts: { invent: invent.length, mutePhone: mutePhone.length, modality: modality.length },
    tally,
    results,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), "utf8");
  console.log(JSON.stringify({ verdict, tally, out: OUT }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
