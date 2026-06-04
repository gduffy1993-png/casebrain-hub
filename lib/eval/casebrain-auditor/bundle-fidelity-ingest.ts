import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
import { detectBundleDocumentTypes } from "@/lib/criminal/bundle-document-signals";
import { extractBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import { resolveWorkflowProfileFromSignals } from "@/lib/criminal/pilot-workflow";
import { extractTextFromFileBuffer } from "@/lib/upload/extract-text-from-file";
import {
  inferAuditorFamilyFromOffence,
} from "./real-case-collector";
import {
  isProvisionalWorkflowProfile,
  isMotoringOffenceText,
  resolveProvisionalWorkflowFromOffence,
} from "./provisional-offence-policy";
import { localCasesRoot } from "./bundle-fidelity-local";

export const NEEDS_REVIEW = "needs_review" as const;

export type DraftedTruthKey = {
  bundleId: string;
  sourceName: string;
  sourcePdfPath: string;
  fictional: false;
  label: string;
  purpose: string;
  sourceType: "linked-external";
  linkStatus: "runnable";
  defendant: string | typeof NEEDS_REVIEW;
  aliases: string[];
  charge: string | typeof NEEDS_REVIEW;
  chargeKeywords: string[];
  court: string | typeof NEEDS_REVIEW | null;
  hearingDate: string | typeof NEEDS_REVIEW | null;
  stage: string | typeof NEEDS_REVIEW | null;
  custodyStatus: string | typeof NEEDS_REVIEW | null;
  documentTypesExpected: string[];
  documentTypesExpectedReview: string[];
  evidenceSignalsExpected: string[];
  missingMaterialExpected: string[];
  thinBundleExpected: boolean | typeof NEEDS_REVIEW;
  partialBundleExpected: boolean | typeof NEEDS_REVIEW;
  expectedWorkflowProfile: string | typeof NEEDS_REVIEW;
  expectedRouteFamily: string | typeof NEEDS_REVIEW | null;
  prohibitedFamilies: string[];
  expectedProvisionalStatus: boolean | typeof NEEDS_REVIEW;
  humanReviewExpected: boolean;
  notes: string;
  fieldsNeedingConfirmation: string[];
  extractionChars: number;
};

function familyFromFilename(name: string): {
  profileHint: string | null;
  chargeKeywords: string[];
  prohibited: string[];
} {
  const n = name.toLowerCase();
  if (/dvr|dangerous_driving|dangerous driving/.test(n)) {
    return {
      profileHint: "generic_motoring_provisional",
      chargeKeywords: ["dangerous driving", "road traffic act", "section 2"],
      prohibited: ["fraud_account_control", "pwits_phone_attribution", "robbery_identification", "violence_domestic_assault"],
    };
  }
  if (/frd|fraud/.test(n)) {
    return {
      profileHint: "fraud_account_control",
      chargeKeywords: ["fraud", "false representation", "dishonest"],
      prohibited: ["pwits_phone_attribution", "robbery_identification"],
    };
  }
  if (/pwi|pwits|pwit/.test(n)) {
    return {
      profileHint: "pwits_phone_attribution",
      chargeKeywords: ["pwits", "intent to supply", "class a", "class b"],
      prohibited: ["fraud_account_control", "robbery_identification"],
    };
  }
  if (/gbh|s\.?18|s18/.test(n)) {
    return {
      profileHint: "violence_domestic_assault",
      chargeKeywords: ["wounding", "s18", "gbh", "oapa"],
      prohibited: ["fraud_account_control", "pwits_phone_attribution"],
    };
  }
  return { profileHint: null, chargeKeywords: [], prohibited: [] };
}

function inferMissingFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const missing: string[] = [];
  const rules: Array<{ re: RegExp; label: string }> = [
    { re: /\b(outstanding|not served|not yet served|awaiting|to follow|not in bundle)\b.*\b(cctv|footage)\b/i, label: "cctv export" },
    { re: /\b(outstanding|not served|awaiting).*\b(mg6|disclosure schedule)\b/i, label: "mg6 schedule" },
    { re: /\b(outstanding|not served|awaiting).*\b(mg11|witness)\b/i, label: "witness statements" },
    { re: /\b(outstanding|not served|awaiting).*\b(expert|collision)\b/i, label: "expert report" },
    { re: /\b(outstanding|not served|awaiting).*\b(cad|999)\b/i, label: "cad/999" },
    { re: /\b(outstanding|not served|awaiting).*\b(phone|download|extraction)\b/i, label: "phone download" },
    { re: /\b(outstanding|not served|awaiting).*\b(medical|hospital)\b/i, label: "medical records" },
  ];
  for (const { re, label } of rules) {
    if (re.test(text)) missing.push(label);
  }
  return [...new Set(missing)];
}

function chargeKeywordsFromText(charge: string | null, hints: string[]): string[] {
  const kws = [...hints];
  if (!charge) return kws;
  const t = charge.toLowerCase();
  if (/\bdangerous driving\b/.test(t)) kws.push("dangerous driving", "section 2");
  if (/\bfraud\b/.test(t)) kws.push("fraud");
  if (/\bpwit|pwits|intent to supply\b/.test(t)) kws.push("pwits", "intent to supply");
  if (/\bwounding|s\.?\s*18|gbh\b/.test(t)) kws.push("wounding", "s18", "gbh");
  return [...new Set(kws)];
}

export function draftTruthKeyFromBundleText(
  bundleText: string,
  sourceName: string,
  sourcePdfPath: string,
  bundleId: string,
): DraftedTruthKey {
  const fileHints = familyFromFilename(sourceName);
  const meta = extractBundleCaseMetadata(bundleText);
  const inferenceText = [meta.offenceWording, meta.offenceDisplay].filter(Boolean).join(" — ");
  const docTypes = detectBundleDocumentTypes(bundleText);
  const docReview: string[] = [];
  const expectedDocs = ["charge_sheet", "mg5", "mg11", "mg6", "index", "cctv", "interview", "medical", "custody"];
  for (const d of expectedDocs) {
    if (docTypes.includes(d)) continue;
    if (/\b(mg5|charge|witness|mg6|index|cctv|interview|medical|custody)\b/i.test(bundleText) && d === "mg5" && !docTypes.includes("mg5")) {
      docReview.push(d);
    }
  }

  const fieldsNeedingConfirmation: string[] = [];
  const pick = <T>(value: T | null | undefined, field: string): T | typeof NEEDS_REVIEW => {
    if (value == null || (typeof value === "string" && !value.trim())) {
      fieldsNeedingConfirmation.push(field);
      return NEEDS_REVIEW;
    }
    return value as T;
  };

  const defendant = pick(meta.defendantName, "defendant");
  let chargeRaw = meta.offenceWording ?? meta.offenceDisplay;
  if (!chargeRaw?.trim()) {
    const m =
      bundleText.match(/^Charge:\s*(.+)$/im) ??
      bundleText.match(/\bcharged with\s+([^.\n]{12,160}?)(?:\s+in that|\s+on \d)/i);
    chargeRaw = m?.[1]?.trim() ?? null;
  }
  const charge = pick(chargeRaw, "charge");

  const provisional = resolveProvisionalWorkflowFromOffence(inferenceText || (typeof charge === "string" ? charge : ""));
  const profileFromText = resolveWorkflowProfileFromSignals({
    allegation: inferenceText,
    bundleText,
    caseTitle: sourceName,
    clientLabel: typeof defendant === "string" ? defendant : undefined,
  });
  const routeFamily = inferAuditorFamilyFromOffence(inferenceText);

  let expectedProfile: string | typeof NEEDS_REVIEW =
    fileHints.profileHint ?? (provisional ?? profileFromText);
  if (expectedProfile === "generic" && fileHints.profileHint) {
    expectedProfile = fileHints.profileHint;
  }
  if (expectedProfile === "generic") {
    fieldsNeedingConfirmation.push("expectedWorkflowProfile");
    expectedProfile = NEEDS_REVIEW;
  }

  const thin =
    bundleText.length < 22_000 || /\bthin bundle\b/i.test(bundleText) ? true : bundleText.length > 120_000 ? false : NEEDS_REVIEW;
  if (thin === NEEDS_REVIEW) fieldsNeedingConfirmation.push("thinBundleExpected");

  const partial = /messy|ocr|corrupt|partial/i.test(sourceName) ? true : NEEDS_REVIEW;
  if (partial === NEEDS_REVIEW) fieldsNeedingConfirmation.push("partialBundleExpected");

  const hearingIso = meta.nextHearingIso;
  const hearingDate = hearingIso
    ? pick(hearingIso.slice(0, 10), "hearingDate")
    : pick(null as string | null, "hearingDate");

  return {
    bundleId,
    sourceName,
    sourcePdfPath,
    fictional: false,
    label: typeof defendant === "string" ? `Local — ${defendant}` : `Local — ${sourceName}`,
    purpose: "Auto-drafted from local PDF extract — confirm fields marked needs_review",
    sourceType: "linked-external",
    linkStatus: "runnable",
    defendant,
    aliases: typeof defendant === "string" ? [defendant.split(/\s+/).pop()!].filter(Boolean) : [],
    charge,
    chargeKeywords: chargeKeywordsFromText(typeof charge === "string" ? charge : null, fileHints.chargeKeywords),
    court: pick(meta.court, "court"),
    hearingDate,
    stage: pick(meta.stage, "stage"),
    custodyStatus: pick(meta.bailStatus, "custodyStatus"),
    documentTypesExpected: docTypes,
    documentTypesExpectedReview: docReview,
    evidenceSignalsExpected: docTypes.filter((d) => !["charge_sheet", "index", "cover"].includes(d)),
    missingMaterialExpected: inferMissingFromText(bundleText),
    thinBundleExpected: thin,
    partialBundleExpected: partial,
    expectedWorkflowProfile: expectedProfile,
    expectedRouteFamily:
      routeFamily ??
      (isProvisionalWorkflowProfile(expectedProfile as never) ? null : (expectedProfile as string)),
    prohibitedFamilies: fileHints.prohibited.length
      ? fileHints.prohibited
      : ["fraud_account_control", "pwits_phone_attribution", "robbery_identification", "violence_domestic_assault"],
    expectedProvisionalStatus:
      typeof expectedProfile === "string" && isProvisionalWorkflowProfile(expectedProfile as never)
        ? true
        : typeof expectedProfile === "string" && isMotoringOffenceText(inferenceText)
          ? true
          : NEEDS_REVIEW,
    humanReviewExpected: true,
    notes: `Auto-ingested from ${sourcePdfPath}. PDF not copied into repo. Confirm all needs_review fields.`,
    fieldsNeedingConfirmation,
    extractionChars: bundleText.length,
  };
}

export type IngestLocalPdfResult = {
  bundleId: string;
  caseDir: string;
  truthKey: DraftedTruthKey;
  extractOk: boolean;
  extractError?: string;
};

export async function ingestLocalPdf(params: {
  pdfPath: string;
  bundleId: string;
}): Promise<IngestLocalPdfResult> {
  const sourcePdfPath = path.resolve(params.pdfPath);
  const sourceName = path.basename(sourcePdfPath);
  const caseDir = path.join(localCasesRoot(), params.bundleId);
  fs.mkdirSync(caseDir, { recursive: true });

  let bundleText = "";
  let extractOk = true;
  let extractError: string | undefined;

  try {
    const buffer = fs.readFileSync(sourcePdfPath);
    bundleText = await extractTextFromFileBuffer(sourceName, "application/pdf", buffer);
    if (!bundleText.trim() || bundleText.trim().length < 80) {
      extractOk = false;
      extractError = "PDF extract returned very little text (scanned/image-only?).";
      bundleText = `# Extract failed or thin\n\n${extractError}\n\nSource: ${sourcePdfPath}\n`;
    }
  } catch (e) {
    extractOk = false;
    extractError = e instanceof Error ? e.message : String(e);
    bundleText = `# Extract error\n\n${extractError}\n\nSource: ${sourcePdfPath}\n`;
  }

  const header = [
    "# Local bundle extract (gitignored — do not commit)",
    "",
    `Source PDF: ${sourcePdfPath}`,
    `Extracted: ${new Date().toISOString()}`,
    extractOk ? "" : `Extract status: FAILED — ${extractError}`,
    "",
    "---",
    "",
  ].join("\n");

  fs.writeFileSync(path.join(caseDir, "bundle-text.md"), header + bundleText.slice(0, 500_000), "utf8");

  const truthKey = draftTruthKeyFromBundleText(
    extractOk ? bundleText : "",
    sourceName,
    sourcePdfPath,
    params.bundleId,
  );
  fs.writeFileSync(path.join(caseDir, "truth-key.json"), JSON.stringify(truthKey, null, 2), "utf8");
  fs.writeFileSync(
    path.join(caseDir, "ingest-meta.json"),
    JSON.stringify({ sourcePdfPath, extractOk, extractError, ingestedAt: new Date().toISOString() }, null, 2),
    "utf8",
  );

  return { bundleId: params.bundleId, caseDir, truthKey, extractOk, extractError };
}
