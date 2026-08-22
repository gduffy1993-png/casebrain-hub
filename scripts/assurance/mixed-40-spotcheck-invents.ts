/**
 * Spot-check mixed-40 INVENT rows: PDF pairing + whether UI claim is truly absent from PDF.
 * Run: npx tsx scripts/assurance/mixed-40-spotcheck-invents.ts
 */
import fs from "node:fs";
import path from "node:path";
import { extractTextFromFileBuffer } from "@/lib/upload/extract-text-from-file";

const ROOT = process.cwd();
const PACK = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/pattern-fix-queue-v1/mixed-40-pdf-truth",
);
const board = JSON.parse(fs.readFileSync(path.join(PACK, "MIXED-40-BOARD.json"), "utf8"));

const FLAG_PDF: Record<string, RegExp> = {
  invent_export_log: /\bexport\s*log\b/i,
  invent_cctv_master: /CCTV master|full CCTV|full window|master footage|full master/i,
  invent_phone_download: /phone download|source export|digital extraction|phone extraction|handset download/i,
  invent_interview_recording:
    /interview recording|PACE recording|ROTI|full recording(?:\/transcript)? outstanding|summary only\s*\/\s*full recording/i,
  invent_bwv_full_export: /full BWV|BWV export|BWV clip|body[- ]worn/i,
};

async function main() {
  const invents = (board.board as Array<Record<string, unknown>>).filter((r) => r.severity === "INVENT");
  const rows = [];
  for (const r of invents) {
    const caseId = String(r.caseId);
    const pdfPath = String(r.pdf_path);
    const label = String(r.label);
    const dir = path.join(PACK, "cases", caseId);
    const ui = ["overview", "papers", "disclosure-chase", "client-summary", "court", "file"]
      .map((t) => {
        const p = path.join(dir, `${t}.txt`);
        return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
      })
      .join("\n");

    let pdfText = "";
    let pdfErr: string | null = null;
    try {
      pdfText = await extractTextFromFileBuffer(path.basename(pdfPath), "application/pdf", fs.readFileSync(pdfPath));
    } catch (e: any) {
      pdfErr = String(e?.message || e).slice(0, 200);
    }
    const pdfHay = (pdfText || "").slice(0, 400_000);
    const flags = (r.flags as string[]) || [];
    const perFlag = flags.map((f) => {
      const re = FLAG_PDF[f];
      const inPdf = re ? re.test(pdfHay) : null;
      return { flag: f, pdf_has_family: inPdf };
    });
    // Pairing heuristic: LIVE recovery title vs factory CB-TB pdf
    const pairingSuspect =
      (/LIVE\s+\d+/i.test(label) && /CB-TB-\d+/i.test(pdfPath)) ||
      (/Robbery Charge/i.test(label) && /Arden/i.test(pdfPath) && !/Arden Vale|CB-FRESH|pilot/i.test(label));

    const trueInvent = perFlag.filter((p) => p.pdf_has_family === false).map((p) => p.flag);
    const detectorNoise = perFlag.filter((p) => p.pdf_has_family === true).map((p) => p.flag);

    rows.push({
      caseId,
      label: label.slice(0, 100),
      pdf: path.basename(pdfPath),
      pairingSuspect,
      trueInvent,
      detectorNoiseOrMidstate: detectorNoise,
      class: pairingSuspect
        ? "PAIRING_SUSPECT"
        : trueInvent.length
          ? "TRUE_INVENT_CANDIDATE"
          : "DETECTOR_OR_MIDSTATE",
    });
  }

  const out = {
    n_invent: invents.length,
    by_class: rows.reduce((a: Record<string, number>, r) => {
      a[r.class] = (a[r.class] || 0) + 1;
      return a;
    }, {}),
    rows,
  };
  fs.writeFileSync(path.join(PACK, "MIXED-40-INVENT-SPOTCHECK.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
