import fs from "fs";
import path from "path";
import { extractTextFromFileBuffer } from "@/lib/upload/extract-text-from-file";
import { buildDisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildBundleTruthLedger } from "@/lib/criminal/bundle-truth-ledger";

type Row = { unique_key: string; case_key: string; pdf_path: string };

async function main() {
  const rows = JSON.parse(
    fs.readFileSync(
      "artifacts/casebrain-qa/assurance/court-criminal-sweep-v1/tip-sample-c2-phone-paths.json",
      "utf8",
    ),
  ) as Row[];
  const out: any[] = [];
  for (const row of rows) {
    if (!fs.existsSync(row.pdf_path)) {
      out.push({ ...row, ok: false, error: "missing" });
      continue;
    }
    const text = await extractTextFromFileBuffer(
      path.basename(row.pdf_path),
      "application/pdf",
      fs.readFileSync(row.pdf_path),
    );
    const ledger = buildBundleTruthLedger({ bundleText: text });
    const chase = buildDisclosureChaseBrief({
      caseId: "tip",
      caseTitle: row.case_key,
      clientLabel: ledger.defendant?.defendant || "D",
      allegation: ledger.charge?.wording || "allegation",
      stage: "PTPH",
      hearingStatus: "Unknown",
      hearingDateIso: null,
      bundleHealth: "ok",
      positionStatus: "provisional",
      battleboard: null,
      bundleText: text,
    });
    const phoneLabels = chase.primaryItems
      .filter((i) => /phone download|phone extraction|source extraction/i.test(i.label))
      .map((i) => i.label);
    const hasFull = phoneLabels.some((l) => /^Full phone download/i.test(l));
    const hasMid = phoneLabels.some((l) => /summary only/i.test(l));
    const pdfHasDownload =
      /phone\s+download|phone\s+extraction|source\s+export|logical\s+download|download\s+report/i.test(text);
    const invent = hasFull && !pdfHasDownload;
    out.push({
      case_key: row.case_key,
      phoneLabels,
      hasFull,
      hasMid,
      pdfHasDownload,
      invent_full_without_source: invent,
      cleared: !invent,
    });
  }
  const inventN = out.filter((r) => r.invent_full_without_source).length;
  const cleared = out.filter((r) => r.cleared).length;
  const result = {
    tip: "c2-court-phone-download-gate",
    n: out.length,
    cleared,
    residual_invent_full: inventN,
    rows: out,
  };
  fs.mkdirSync("artifacts/casebrain-qa/assurance/court-criminal-sweep-v1", { recursive: true });
  fs.writeFileSync(
    "artifacts/casebrain-qa/assurance/court-criminal-sweep-v1/tip-sample-c2-phone.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify({ n: result.n, cleared, residual_invent_full: inventN }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
