import fs from "fs";
import path from "path";
import { extractTextFromFileBuffer } from "@/lib/upload/extract-text-from-file";
import { extractBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import {
  PILOT_COURT_NOT_IDENTIFIED_LABEL,
  displayPilotStripCourt,
} from "@/components/criminal/workflow/workflowPilotDisplay";

type PathRow = {
  unique_key: string;
  case_key: string;
  pdf_path: string;
  prior_court?: string;
};

function scoreInventCourt(bundleText: string, courtShown: string | null): boolean {
  if (!courtShown || /not safely|HEADER_COURT_MUTED/i.test(courtShown)) return false;
  const pdfHasCourt = /\b(?:Magistrates(?:'|’)?\s+Court|Crown\s+Court|Youth\s+Court)\b/i.test(bundleText);
  // Glued CourtCrown Court — word-boundary may miss; also accept Crown Court substring
  const pdfHasCourtLoose = /Crown\s*Court|Magistrates/i.test(bundleText);
  const escaped = courtShown.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 40);
  const nameInPdf = escaped.length > 4 && new RegExp(escaped, "i").test(bundleText);
  if ((pdfHasCourt || pdfHasCourtLoose || nameInPdf) && !/Hearing/i.test(courtShown)) return false;
  // Residual invent: shown court with Hearing glue, or shown court with no PDF support
  if (/Hearing/i.test(courtShown)) return true;
  if (!pdfHasCourt && !pdfHasCourtLoose && !nameInPdf && bundleText.length > 800) return true;
  return false;
}

async function main() {
  const rows = JSON.parse(
    fs.readFileSync(
      "artifacts/casebrain-qa/assurance/file-criminal-sweep-v1/tip-resweep-invent-court-paths.json",
      "utf8",
    ),
  ) as PathRow[];

  const outRows: any[] = [];
  let residual = 0;
  let cleared = 0;
  let missing = 0;

  for (const row of rows) {
    if (!fs.existsSync(row.pdf_path)) {
      missing++;
      outRows.push({ ...row, ok: false, error: "missing_pdf" });
      continue;
    }
    const text = await extractTextFromFileBuffer(
      path.basename(row.pdf_path),
      "application/pdf",
      fs.readFileSync(row.pdf_path),
    );
    const meta = extractBundleCaseMetadata(text);
    const courtShown = displayPilotStripCourt(meta.court) || meta.court || "";
    const invent = scoreInventCourt(text, courtShown);
    if (invent) residual++;
    else cleared++;
    outRows.push({
      case_key: row.case_key,
      prior_court: row.prior_court,
      court: courtShown || PILOT_COURT_NOT_IDENTIFIED_LABEL,
      invent_court_header: invent,
      hasTrailingHearing: /Hearing/i.test(courtShown || ""),
    });
  }

  const result = {
    productSha: "627789b1e",
    family: "invent_court_header",
    before: 43,
    after: residual,
    cleared,
    missing,
    n: rows.length,
    rows: outRows,
  };
  const dir = "artifacts/casebrain-qa/assurance/file-criminal-sweep-v1/tip-resweep-627789b1e";
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "invent-court-resweep.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ before: 43, after: residual, cleared, missing, n: rows.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
