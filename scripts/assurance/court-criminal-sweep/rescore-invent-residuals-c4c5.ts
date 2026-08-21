/**
 * Offline re-score of Court tip invent residuals after C4/C5.
 * Reuses tip-resweep-d2 index + hitlist invent rows only (not full 2600).
 *
 *   npx tsx scripts/assurance/court-criminal-sweep/rescore-invent-residuals-c4c5.ts
 */
import fs from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildBundleTruthLedger } from "@/lib/criminal/bundle-truth-ledger";
import { extractTextFromFileBuffer } from "@/lib/upload/extract-text-from-file";

const ROOT = process.cwd();
const TIP =
  "artifacts/casebrain-qa/assurance/court-criminal-sweep-v1/tip-resweep-d2-e20e0b1da";
const INDEX = path.join(ROOT, TIP, "CRIMINAL-UNIQUE-INDEX.csv");
const HITLIST = path.join(ROOT, TIP, "COURT-FAIL-HITLIST.csv");
const OUT = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/court-criminal-sweep-v1/tip-rescore-c4c5-invent",
);
const MAX_BUNDLE = 220_000;

function parseCsvLine(line: string): string[] {
  // Hitlist / index are simple comma CSV without nested commas in flag fields for invent rows.
  return line.split(",");
}

function loadIndex(): Map<string, { pdf_path: string; source_id: string; display_name: string }> {
  const lines = fs.readFileSync(INDEX, "utf8").split(/\n/).filter(Boolean);
  const h = parseCsvLine(lines[0]!);
  const iCase = h.indexOf("case_key");
  const iPdf = h.indexOf("pdf_path");
  const iSrc = h.indexOf("source_id");
  const iName = h.indexOf("display_name");
  const map = new Map<string, { pdf_path: string; source_id: string; display_name: string }>();
  for (const line of lines.slice(1)) {
    const c = parseCsvLine(line);
    map.set(c[iCase]!, {
      pdf_path: c[iPdf] || "",
      source_id: c[iSrc] || "",
      display_name: c[iName] || c[iSrc] || c[iCase]!,
    });
  }
  return map;
}

function inventKeysFromHitlist(): Array<{ case_key: string; before_flags: string[] }> {
  const lines = fs.readFileSync(HITLIST, "utf8").split(/\n/).filter(Boolean);
  const h = parseCsvLine(lines[0]!);
  const iCase = h.indexOf("case_key");
  const iFlags = h.indexOf("fail_flags");
  const out: Array<{ case_key: string; before_flags: string[] }> = [];
  for (const line of lines.slice(1)) {
    const c = parseCsvLine(line);
    const flags = (c[iFlags] || "")
      .split("|")
      .map((f) => f.trim())
      .filter((f) => f.startsWith("invent_"));
    if (!flags.length) continue;
    out.push({ case_key: c[iCase]!, before_flags: flags });
  }
  return out;
}

function scoreInvent(bundleText: string, claimBlob: string): string[] {
  const inventFlags: string[] = [];
  const phoneClaimHay = claimBlob
    .replace(/not\s+(?:a\s+)?full\s+phone\s+download[^.!\n]{0,100}/gi, " ")
    .replace(/not\s+full\s+phone\s+download[^.!\n]{0,100}/gi, " ")
    .replace(/screenshots?\s+alone\s+are\s+not\s+attribution[^.!\n]{0,80}/gi, " ");
  const evidence = {
    export_log_claim: /\bexport\s+log\b/i.test(claimBlob),
    export_log_source: /\bexport\s*log\b/i.test(bundleText),
    cctv_master_claim: /CCTV master|full CCTV master|master footage|master recording|CCTV full window/i.test(claimBlob),
    cctv_master_source:
      /CCTV master|full CCTV master|master footage|full master|full\s*(?:time\s+)?window|full\s+cctv\s+(?:master|window)/i.test(
        bundleText,
      ),
    phone_download_claim:
      /phone download|source export referred|digital extraction|original download|phone extraction/i.test(phoneClaimHay),
    phone_download_source:
      /phone download|source export|handset download|digital extraction|extraction report|phone extraction|logical download|download report/i.test(
        bundleText,
      ),
    cad_999_claim: /\bCAD\b|999\s+audio|complete CAD/i.test(claimBlob),
    cad_999_source: /\bCAD\b|999\s+audio|CAD\/999|command and (?:dispatch|control)/i.test(bundleText),
    interview_recording_claim: /interview recording|PACE recording|audio.?visual interview/i.test(claimBlob),
    interview_recording_source:
      /interview recording|PACE recording|audio.?visual interview|\bROTI\b|full recording(?:\/transcript)? outstanding|summary only\s*\/\s*full recording|interview summary[^.\n]{0,40}full recording/i.test(
        bundleText,
      ),
    bwv_claim: /(?:^|[^A-Za-z])BWV(?![A-Za-z])|body[- ]worn/i.test(claimBlob),
    bwv_source: /(?:^|[^A-Za-z])BWV(?![A-Za-z])|body[- ]worn/i.test(bundleText),
  };
  const thin = bundleText.length < 3500;
  const trapThin = /hallucination trap|do not invent|no pace interview transcript or summary/i.test(bundleText);

  if (evidence.export_log_claim && !evidence.export_log_source) inventFlags.push("invent_export_log");
  if (evidence.cctv_master_claim && !evidence.cctv_master_source && (thin || trapThin || !/\bcctv\b/i.test(bundleText))) {
    inventFlags.push("invent_cctv_master");
  }
  if (evidence.phone_download_claim && !evidence.phone_download_source) inventFlags.push("invent_phone_download");
  if (evidence.cad_999_claim && !evidence.cad_999_source) inventFlags.push("invent_cad_999");
  if (evidence.interview_recording_claim && !evidence.interview_recording_source) {
    inventFlags.push("invent_interview_recording");
  }
  if (evidence.bwv_claim && !evidence.bwv_source) inventFlags.push("invent_bwv");
  return inventFlags;
}

function inventClaimBlobFromProjection(bundleText: string, title: string): string {
  const hay = bundleText.slice(0, MAX_BUNDLE);
  const ledger = buildBundleTruthLedger({ bundleText: hay });
  const allegation = ledger.charge?.wording || title || "Criminal allegation";
  const clientLabel = ledger.defendant?.defendant || title || "Defendant";
  const chase = buildDisclosureChaseBrief({
    caseId: "court-rescore",
    caseTitle: title,
    clientLabel,
    allegation,
    stage: "PTPH",
    hearingStatus: ledger.hearing?.rawLiteral ? "Listed" : "Unknown",
    hearingDateIso: ledger.hearing?.dateIso ?? null,
    bundleHealth: "ok",
    positionStatus: "provisional",
    battleboard: null,
    bundleText: hay,
  });
  const war = buildHearingWarRoomBrief({
    caseId: "court-rescore",
    caseTitle: title,
    clientLabel,
    allegation,
    stage: "PTPH",
    hearingStatus: ledger.hearing?.rawLiteral ? "Listed" : "Unknown",
    bundleHealth: "ok",
    positionStatus: "provisional",
    readiness: "provisional",
    hasSavedPosition: false,
    battleboard: null,
    chaseItems: chase.primaryItems.map((i) => i.label),
    bundleText: hay,
  });
  const claims: string[] = [];
  if (chase.safeCourtLine) claims.push(`SAFE_COURT | ${chase.safeCourtLine}`);
  if (war.safePositionToday) claims.push(`SAFE_POSITION | ${war.safePositionToday}`);
  for (const item of [...chase.primaryItems, ...chase.additionalItems].slice(0, 24)) {
    claims.push(`CHASE | ${item.label} | ${item.baseStatus}`);
    if (item.courtLine) claims.push(`COURT_LINE | ${item.courtLine}`);
    if (item.whyItMatters) claims.push(`WHY | ${item.whyItMatters}`);
  }
  for (const line of (war as { doNotOverstate?: string[] }).doNotOverstate ?? []) {
    if (line) claims.push(`DO_NOT | ${line}`);
  }
  return claims.filter((c) => !/^DO_NOT\b/i.test(c)).join("\n");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const index = loadIndex();
  const residuals = inventKeysFromHitlist();
  const rows: Array<Record<string, unknown>> = [];

  console.log(`rescoring ${residuals.length} invent residual keys → ${OUT}`);

  for (const r of residuals) {
    const meta = index.get(r.case_key);
    if (!meta?.pdf_path || !fs.existsSync(meta.pdf_path)) {
      rows.push({
        case_key: r.case_key,
        before: r.before_flags,
        after: ["ERROR_MISSING_PDF"],
        cleared: false,
        error: "missing_pdf",
      });
      console.log("MISS", r.case_key);
      continue;
    }
    const text = await extractTextFromFileBuffer(
      path.basename(meta.pdf_path),
      "application/pdf",
      fs.readFileSync(meta.pdf_path),
    );
    const bundleText = (text || "").slice(0, MAX_BUNDLE);
    const inventClaimBlob = inventClaimBlobFromProjection(bundleText, meta.display_name || r.case_key);
    const after = scoreInvent(bundleText, inventClaimBlob);
    const cleared = after.length === 0;
    rows.push({
      case_key: r.case_key,
      source_id: meta.source_id,
      before: r.before_flags,
      after,
      cleared,
      bundle_len: bundleText.length,
    });
    console.log(
      cleared ? "CLEAR" : "KEEP",
      r.case_key,
      "before=",
      r.before_flags.join("|"),
      "after=",
      after.join("|") || "(none)",
    );
  }

  const byBefore: Record<string, { before: number; after: number }> = {};
  for (const row of rows) {
    for (const f of (row.before as string[]) || []) {
      byBefore[f] ??= { before: 0, after: 0 };
      byBefore[f]!.before += 1;
    }
    for (const f of (row.after as string[]) || []) {
      if (f.startsWith("ERROR")) continue;
      byBefore[f] ??= { before: 0, after: 0 };
      byBefore[f]!.after += 1;
    }
  }

  const inventAfter = rows.reduce(
    (n, r) => n + ((r.after as string[]) || []).filter((f) => f.startsWith("invent_")).length,
    0,
  );
  const clearedN = rows.filter((r) => r.cleared).length;

  const summary = {
    tip_sha_note: "code tip with C4+C5 armour",
    source_hitlist: HITLIST,
    residual_keys: residuals.length,
    cleared_keys: clearedN,
    invent_events_before: residuals.reduce((n, r) => n + r.before_flags.length, 0),
    invent_events_after: inventAfter,
    by_flag: byBefore,
    rows,
  };

  fs.writeFileSync(path.join(OUT, "RESCORE-RESULT.json"), JSON.stringify(summary, null, 2));
  const md = [
    `# COURT TIP INVENT RESCORE — C4/C5`,
    ``,
    `**Keys:** ${residuals.length} invent residuals from \`${TIP}\``,
    `**Cleared keys:** **${clearedN}/${residuals.length}**`,
    `**Invent events:** ${summary.invent_events_before} → **${inventAfter}**`,
    ``,
    `| Flag | Before | After |`,
    `|------|-------:|------:|`,
    ...Object.entries(byBefore).map(([f, v]) => `| \`${f}\` | ${v.before} | **${v.after}** |`),
    ``,
    `Pack: \`${path.relative(ROOT, OUT).replace(/\\/g, "/")}/\``,
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "RESCORE-STATUS.md"), md);
  console.log(md);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
