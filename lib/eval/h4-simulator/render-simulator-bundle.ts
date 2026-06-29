/**
 * Render fictional H4 simulator bundle text from manifest case entry.
 */
import type { SimulatorManifestCase } from "./manifest-types";

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

function layoutSection(entry: SimulatorManifestCase): string {
  const layout = entry.pdfLayoutType;
  if (layout.includes("rotated")) {
    return ["=== SECTION: LAYOUT_ROTATED ===", "", "Pages scanned at 90° rotation — OCR may be unreliable.", ""].join("\n");
  }
  if (layout.includes("bad_ocr") || layout === "bad_ocr_scan") {
    return ["=== SECTION: LAYOUT_BAD_OCR ===", "", "L0w-res sc4n — w0rds may be br0ken.", ""].join("\n");
  }
  if (layout.includes("duplicate")) {
    return ["=== SECTION: LAYOUT_DUPLICATE ===", "", "Duplicate page numbers detected — same statement appears twice.", ""].join("\n");
  }
  if (layout.includes("out_of_order") || layout === "pages_out_of_order") {
    return ["=== SECTION: LAYOUT_OUT_OF_ORDER ===", "", "Bundle pages assembled out of sequence — index may not match body.", ""].join("\n");
  }
  if (layout.includes("two_column")) {
    return ["=== SECTION: LAYOUT_TWO_COLUMN ===", "", "| Col A | Col B | schedule fragments may bleed across columns.", ""].join("\n");
  }
  if (layout.includes("skewed")) {
    return ["=== SECTION: LAYOUT_SKEWED ===", "", "Skewed scan margins — table rows may be misaligned.", ""].join("\n");
  }
  if (layout.includes("corrected") || layout === "corrected_indictment") {
    return ["=== SECTION: CORRECTED_CHARGE ===", "", "Amended indictment served — earlier count pages may remain in bundle.", ""].join("\n");
  }
  if (layout.includes("missing_mg6")) {
    return ["=== SECTION: MG6_VAGUE ===", "", "MG6C header present — line-level unused material detail not served.", ""].join("\n");
  }
  if (layout.includes("conflicting_mg11")) {
    return ["=== SECTION: CONFLICTING_MG11 ===", "", "Two MG11 versions on bundle — signed final version not identified.", ""].join("\n");
  }
  if (layout.includes("blank") || layout.includes("placeholder")) {
    return ["=== SECTION: BLANK_NOISE ===", "", "[BLANK PAGE]", "Filename: PLACEHOLDER_TBC.docx", ""].join("\n");
  }
  if (layout === "very_thin" || layout.includes("thin_sjp") || layout.includes("very_thin")) {
    return ["=== SECTION: THIN_BUNDLE ===", "", "Minimal papers on file — thin bundle.", ""].join("\n");
  }
  return "";
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
    case "encro_handle_attribution":
      return [
        "=== SECTION: ENCROCHAT ===",
        "",
        "Encrypted comms platform — partial message extracts served.",
        "Handle NIGHTHAWK-14 referenced — handle-to-user mapping NOT served.",
        "Co-defendant J. Rivers messages appear on shared thread — attribution segregated.",
        "Full platform extraction and continuity certificate outstanding.",
        "",
      ].join("\n");
    case "county_lines_role_unclear":
      return [
        "=== SECTION: COUNTY_LINES ===",
        "",
        "Phone line attribution unclear — runner vs line holder not established.",
        "Cellsite/travel data referred only. Cash/drug continuity missing.",
        "Safeguarding note: possible exploitation/modern slavery marker — needs review only.",
        "",
      ].join("\n");
    case "conspiracy_codef_bleed":
      return [
        "=== SECTION: CO_DEFENDANTS ===",
        "",
        "Indictment: Samira Khan, A. Okonkwo, T. Wright (co-defendants).",
        "Group chat messages served — supply chain inference risk across defendants.",
        "Per-defendant exhibit map and telecom downloads outstanding.",
        "",
      ].join("\n");
    case "multi_hand_participation":
      return [
        "=== SECTION: MULTI_HAND ===",
        "",
        "Multiple males at scene — participation vs presence disputed.",
        "Witness A: defendant present. Witness B: cannot identify participant.",
        "Joint enterprise must not be assumed on papers served.",
        "",
      ].join("\n");
    case "robbery_cctv_stills_only":
      return [
        "=== SECTION: CCTV_STILLS ===",
        "",
        "CCTV stills served — grainy/poor quality captures only.",
        "Master footage full time window NOT served. VIPER/ID procedure missing.",
        "",
      ].join("\n");
    case "sexual_historic_abe":
      return [
        "=== SECTION: HISTORIC_SEXUAL ===",
        "",
        "Historic allegation — significant delay noted in MG5.",
        "ABE interview referred only — recording not served.",
        "First complainant account/MG11 outstanding. Third-party records mentioned only.",
        "",
      ].join("\n");
    case "phone_download_scope_missing":
      return [
        "=== SECTION: PHONE_DOWNLOAD ===",
        "",
        "Screenshots served from handset — full UFED/download not on bundle.",
        "Extraction metadata, search terms and scope schedule outstanding.",
        "Continuity certificate missing.",
        "",
      ].join("\n");
    default:
      return genericTrapSection(entry);
  }
}

function genericTrapSection(entry: SimulatorManifestCase): string {
  const lines = [
    "=== SECTION: CASE_NOTE ===",
    "",
    entry.mainIssue,
    "",
  ];
  if (entry.servedEvidence.length) {
    lines.push(`Served on bundle: ${entry.servedEvidence.join("; ")}.`, "");
  }
  if (entry.referredOnlyEvidence.length) {
    lines.push(`Referred only: ${entry.referredOnlyEvidence.join("; ")}.`, "");
  }
  if (entry.missingEvidence.length) {
    lines.push(`Outstanding: ${entry.missingEvidence.join("; ")}.`, "");
  }
  if (entry.uncertainEvidence.length) {
    lines.push(`Uncertain: ${entry.uncertainEvidence.join("; ")}.`, "");
  }
  return lines.join("\n");
}

export function renderSimulatorBundleText(entry: SimulatorManifestCase): string {
  const lines: string[] = [
    "RESTRICTED — PROSECUTION DISCLOSURE BUNDLE",
    "",
    `URN: ${urn(entry.caseId)}`,
    `Defendant: ${entry.fakeDefendant}`,
    `Court: ${entry.fakeCourt}`,
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
    entry.profile.startsWith("sexual") || entry.offenceFamily === "sexual"
      ? "MG11 — COMPLAINANT (not served — first account outstanding)\n\nHistoric context noted — do not treat summary as served statement."
      : entry.referredOnlyEvidence.some((e) => /mg11|statement|complainant/i.test(e))
        ? "MG11 — COMPLAINANT STATEMENT (draft unsigned)\n\nAccount provisional — not final signed statement."
        : "MG11 — COMPLAINANT/WITNESS STATEMENT\n\nWitness account on file — attribution and context require review.",
    "",
    trapSection(entry),
    layoutSection(entry),
    "=== SECTION: LISTING ===",
    "",
    `PTPH listed — ${listingDate(entry.caseId)}, ${entry.fakeCourt}.`,
    "",
  ];

  if (entry.pdfLayoutType === "very_thin") {
    lines.splice(8, 0, "NOTE: Very thin bundle — minimal papers on file.", "");
  }

  return lines.join("\n");
}
