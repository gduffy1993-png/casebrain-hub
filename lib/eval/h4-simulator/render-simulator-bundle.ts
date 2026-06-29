/**
 * Render fictional H4 simulator bundle text from manifest case entry.
 */
import type { SimulatorManifestCase } from "./manifest-v1-cases";

function urn(caseId: string): string {
  const n = caseId.replace("sim-", "").padStart(3, "0");
  return `26/SIM/${n}`;
}

function mg6Line(label: string, status: "served" | "referred" | "outstanding"): string {
  const note =
    status === "served"
      ? "served on bundle"
      : status === "referred"
        ? "referred on MG6 — export not served"
        : "outstanding — not on bundle";
  return `MG6C/${label.slice(0, 3).toUpperCase()} — ${label} — ${note}.`;
}

function listingDate(caseId: string): string {
  const n = parseInt(caseId.replace(/\D/g, ""), 10) || 1;
  const day = 10 + (n % 18);
  const month = ["January", "March", "May", "July", "September", "November"][n % 6];
  return `${day} ${month} 2026, 10:00`;
}

function trapSection(entry: SimulatorManifestCase): string {
  switch (entry.redTeamTrapType) {
    case "ocr_poor_mg6":
    case "jargon_only":
    case "bad_ocr":
      return [
        "=== SECTION: SCANNED_OCR ===",
        "",
        "MG6C/0O1 — BWV — ref|erred on|ly",
        "Cust0dy rec0rd — n0t served",
        "=== SECTION: PIPE_FRAGMENTS ===",
        "| MG11 | draft | unsigned |",
        "",
      ].join("\n");
    case "index_only_bundle":
    case "index_only":
      return [
        "=== SECTION: INDEX_ONLY ===",
        "",
        "BUNDLE INDEX — material listed but not served:",
        "- Body-worn video (full export)",
        "- Custody record (full)",
        "- Medical report",
        "",
        "No substantive statements served beyond this index.",
        "",
      ].join("\n");
    case "mixed_offences_pdf":
    case "mixed_offences":
      return [
        "=== SECTION: MIXED_OFFENCES_NOTE ===",
        "",
        "Bundle also references unrelated fraud account-control schedules and drug continuity logs.",
        "Primary charge remains as charge sheet.",
        "",
      ].join("\n");
    case "multi_defendant_names":
    case "wrong_second_male":
      return [
        "=== SECTION: IDENTITY_NOTE ===",
        "",
        "Witness refers to a second male (James Carter) and defendant (see charge sheet).",
        "Attribution between males not resolved on papers.",
        "",
      ].join("\n");
    case "placeholder_metadata":
      return [
        "=== SECTION: METADATA ===",
        "",
        "Filename: PLACEHOLDER_CHARGE.docx",
        "Metadata offence field: TBC / unknown offence placeholder",
        "",
      ].join("\n");
    default:
      return "";
  }
}

export function renderSimulatorBundleText(entry: SimulatorManifestCase): string {
  const lines: string[] = [
    "RESTRICTED — FICTIONAL H4 SIMULATOR BUNDLE",
    "",
    `URN: ${urn(entry.caseId)}`,
    `Defendant: ${entry.fakeDefendant}`,
    `Court: ${entry.fakeCourt}`,
    `Simulator trap: ${entry.redTeamTrapType}`,
    `Layout: ${entry.pdfLayoutType}`,
    "",
    "=== SECTION: COVER_INDEX ===",
    "",
    "INDEX",
    "",
    "Document | Pages | Note",
    "Charge sheet | 1 |",
    "MG5 case summary | 2-3 |",
    "MG6C disclosure schedule | 4 |",
    ...(entry.servedEvidence.length ? [`Served material | 5+ | ${entry.servedEvidence.join("; ")}`] : []),
    "",
    "=== SECTION: CHARGE ===",
    "",
    `R v ${entry.fakeDefendant}`,
    "",
    `Statement of Offence:`,
    entry.offenceWording,
    "",
    `Particulars of Offence:`,
    `Between 1 January 2026 and 28 February 2026 at ${entry.fakeCourt.replace(/'/g, "")} — particulars per MG5.`,
    "",
    "=== SECTION: MG5 ===",
    "",
    "MG05 — OFFENCE REPORT",
    "",
    `URN: ${urn(entry.caseId)}`,
    "Anticipated Plea: Not Guilty",
    "",
    "Headline Summary",
    entry.mainIssue,
    "",
    "Prosecution summary on current papers remains provisional.",
    entry.expectedSummaryRisk,
    "",
    ...(entry.uncertainEvidence.length
      ? [`Uncertain on papers: ${entry.uncertainEvidence.join("; ")}.`]
      : []),
    "",
    "=== SECTION: MG6 ===",
    "",
    "MG6C — UNUSED MATERIAL SCHEDULE",
    "",
    ...entry.servedEvidence.map((e) => mg6Line(e, "served")),
    ...entry.referredOnlyEvidence.map((e) => mg6Line(e, "referred")),
    ...entry.missingEvidence.map((e) => mg6Line(e, "outstanding")),
    ...(entry.expectedChaseItems.length && !entry.missingEvidence.length
      ? entry.expectedChaseItems.map((e) => mg6Line(e, "outstanding"))
      : []),
    "",
    "=== SECTION: MG11 ===",
    "",
    entry.referredOnlyEvidence.some((e) => /mg11|statement|complainant/i.test(e))
      ? "MG11 — COMPLAINANT STATEMENT (draft unsigned)\n\nAccount provisional — not final signed statement."
      : "MG11 — COMPLAINANT STATEMENT\n\nWitness account on file — attribution and context require review.",
    "",
    trapSection(entry),
    "=== SECTION: LISTING ===",
    "",
    `PTPH listed — ${listingDate(entry.caseId)}, ${entry.fakeCourt}.`,
    "",
    "=== SECTION: SIMULATOR_TRUTH ===",
    "",
    `Profile: ${entry.profile}`,
    `Main issue: ${entry.mainIssue}`,
    `Must not say: ${entry.mustNotSay.join(" | ") || "—"}`,
    "",
  ];

  if (entry.pdfLayoutType === "very_thin") {
    lines.splice(8, 0, "NOTE: Very thin bundle — minimal papers on file.", "");
  }

  return lines.join("\n");
}
