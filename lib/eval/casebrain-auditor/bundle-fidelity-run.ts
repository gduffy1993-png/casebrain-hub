import { detectBundleDocumentTypes } from "@/lib/criminal/bundle-document-signals";
import { extractBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import { resolveWorkflowProfileFromSignals, type WorkflowProfile } from "@/lib/criminal/pilot-workflow";
import {
  inferAuditorFamilyFromOffence,
} from "./real-case-collector";
import {
  isProvisionalWorkflowProfile,
  resolveProvisionalWorkflowFromOffence,
} from "./provisional-offence-policy";
import type { BundleFidelityGoldEntry } from "./bundle-fidelity-pack";
import { loadLocalPack } from "./bundle-fidelity-local";
import { loadGoldPack, readBundleText } from "./bundle-fidelity-pack";
import { NEEDS_REVIEW } from "./bundle-fidelity-ingest";
import type {
  BundleFidelityBundleResult,
  BundleFidelityFieldResult,
  BundleFidelityTruthKey,
} from "./bundle-fidelity-types";

function isNeedsReview(value: unknown): value is typeof NEEDS_REVIEW {
  return value === NEEDS_REVIEW;
}

function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function field(
  fieldName: string,
  status: BundleFidelityFieldResult["status"],
  expected: string,
  actual: string,
  message?: string,
): BundleFidelityFieldResult {
  return { field: fieldName, status, expected, actual, message };
}

export function detectDocumentTypes(text: string): string[] {
  return detectBundleDocumentTypes(text);
}

function detectMissingSignals(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  const missing: string[] = [];
  for (const kw of keywords) {
    const k = kw.toLowerCase();
    const mentioned =
      lower.includes(k) &&
      /\b(outstanding|not served|not yet served|not in bundle|awaiting|to follow|remains outstanding)\b/i.test(
        lower,
      );
    if (mentioned) missing.push(kw);
  }
  return missing;
}

function profileHintFromBundleId(bundleId: string): WorkflowProfile | null {
  const id = bundleId.toLowerCase();
  if (/dangerous|motoring|dvr/.test(id)) return resolveProvisionalWorkflowFromOffence("dangerous driving") ?? "generic_motoring_provisional";
  if (/fraud|frd/.test(id)) return "fraud_account_control";
  if (/pwit|pwi/.test(id)) return "pwits_phone_attribution";
  if (/gbh|s18|violence/.test(id)) return "violence_domestic_assault";
  return null;
}

function resolveWorkflowProfile(fullText: string, truth: BundleFidelityTruthKey): WorkflowProfile {
  const meta = extractBundleCaseMetadata(fullText);
  const chargeForInference = isNeedsReview(truth.charge) ? "" : String(truth.charge ?? "");
  const inferenceText = [meta.offenceWording, meta.offenceDisplay, chargeForInference, truth.bundleId]
    .filter(Boolean)
    .join(" — ");
  const idHint = profileHintFromBundleId(truth.bundleId);
  const provisional = resolveProvisionalWorkflowFromOffence(inferenceText);
  if (provisional) return provisional;
  if (idHint && !isNeedsReview(truth.expectedWorkflowProfile)) {
    const textProv = resolveProvisionalWorkflowFromOffence(inferenceText);
    if (textProv) return textProv;
    if (idHint !== "generic_motoring_provisional") return idHint;
  }

  const chargeFamily = inferAuditorFamilyFromOffence(inferenceText);
  const fromSignals = resolveWorkflowProfileFromSignals({
    allegation: inferenceText,
    bundleText: fullText,
    caseTitle: truth.label ?? truth.bundleId,
    clientLabel: meta.defendantName ?? truth.defendant,
  });

  if (fromSignals !== "generic") return fromSignals;
  if (chargeFamily) return chargeFamily;
  return "generic";
}

function defendantMatches(expected: string, aliases: string[] | undefined, actual: string | null): boolean {
  const names = [expected, ...(aliases ?? [])].map(norm);
  const a = norm(actual);
  if (!a) return false;
  return names.some((n) => {
    if (a.includes(n) || n.includes(a)) return true;
    const expWords = n.split(/\s+/).filter(Boolean);
    const actWords = a.split(/\s+/).filter(Boolean);
    return expWords.length >= 2 && expWords.every((w) => actWords.includes(w));
  });
}

function chargeMatches(truth: BundleFidelityTruthKey, actual: string | null): "pass" | "needs_review" | "fail" {
  if (isNeedsReview(truth.charge)) return "needs_review";
  const a = norm(actual);
  if (!a || a === "sheet" || a.length < 8) return "fail";
  const keywords = truth.chargeKeywords ?? [];
  const chargeStr = typeof truth.charge === "string" ? truth.charge : "";
  const hits = keywords.filter((k) => a.includes(norm(k)) || norm(chargeStr).includes(norm(k)));
  if (hits.length >= Math.min(2, keywords.length) || (chargeStr && a.includes(norm(chargeStr).slice(0, 24)))) {
    return "pass";
  }
  if (keywords.some((k) => a.includes(norm(k)))) return "needs_review";
  return "fail";
}

function inferThinBundle(fullText: string, docTypes: string[]): boolean {
  if (/\bthin[-\s]?ish\b|\bthin bundle\b|bundle size:\s*thin|initial disclosure only\b/i.test(fullText)) {
    return true;
  }
  return docTypes.length <= 5 && fullText.length < 22_000;
}

export function runBundleFidelityCheck(entry: BundleFidelityGoldEntry): BundleFidelityBundleResult {
  const { truthKey: truth } = entry;
  const linkStatus = truth.linkStatus ?? (entry.bundleTextPaths.length ? "runnable" : "linked-only");
  const label = truth.label ?? truth.bundleId;

  if (linkStatus === "linked-only" || linkStatus === "placeholder" || !entry.bundleTextPaths.length) {
    const skipReason =
      linkStatus === "placeholder"
        ? "Add bundle-text.md (pasted extract). PDF-only folders are not read in slice 3."
        : "No markdown/text bundle linked — use pilot-3 auditor or export demo text (slice 2).";
    return {
      bundleId: truth.bundleId,
      label,
      linkStatus: linkStatus === "placeholder" ? "placeholder" : "linked-only",
      skipped: true,
      skipReason,
      overall: "needs_review",
      fields: [
        field(
          "link",
          "skipped",
          "runnable markdown or text file",
          linkStatus,
          "No markdown/text bundle linked — use pilot-3 auditor or export demo text (slice 2).",
        ),
      ],
    };
  }

  const fullText = readBundleText(entry.bundleTextPaths);
  const meta = extractBundleCaseMetadata(fullText);
  const docTypes = detectDocumentTypes(fullText);
  const workflowProfile = resolveWorkflowProfile(fullText, truth);
  const chargeFamily = inferAuditorFamilyFromOffence(
    [meta.offenceWording, meta.offenceDisplay, isNeedsReview(truth.charge) ? "" : truth.charge]
      .filter(Boolean)
      .join(" "),
  );
  const thin = inferThinBundle(fullText, docTypes);
  const missingDetected = detectMissingSignals(fullText, truth.missingMaterialExpected ?? []);

  const fields: BundleFidelityFieldResult[] = [];

  if (isNeedsReview(truth.defendant)) {
    fields.push(
      field(
        "defendant",
        meta.defendantName ? "needs_review" : "fail",
        NEEDS_REVIEW,
        meta.defendantName ?? "—",
        "Confirm defendant on papers.",
      ),
    );
  } else {
    fields.push(
      defendantMatches(truth.defendant, truth.aliases, meta.defendantName)
        ? field("defendant", "pass", truth.defendant, meta.defendantName ?? "—")
        : field("defendant", "fail", truth.defendant, meta.defendantName ?? "—", "Defendant name not extracted."),
    );
  }

  const chargeStatus = chargeMatches(truth, meta.offenceWording ?? meta.offenceDisplay);
  fields.push(
    field(
      "charge",
      chargeStatus,
      truth.charge,
      meta.offenceWording ?? meta.offenceDisplay ?? "—",
      chargeStatus === "needs_review" ? "Partial charge keyword match." : undefined,
    ),
  );

  if (truth.court && isNeedsReview(truth.court)) {
    fields.push(field("court", "needs_review", NEEDS_REVIEW, meta.court ?? "—", "Confirm court."));
  } else if (truth.court && typeof truth.court === "string") {
    const courtOk = norm(meta.court).includes(norm(truth.court).slice(0, 12));
    fields.push(
      courtOk
        ? field("court", "pass", truth.court, meta.court ?? "—")
        : field("court", "needs_review", truth.court, meta.court ?? "—", "Court not clearly extracted."),
    );
  }

  if (truth.stage && isNeedsReview(truth.stage)) {
    fields.push(field("stage", "needs_review", NEEDS_REVIEW, meta.stage ?? "—", "Confirm stage."));
  } else if (truth.stage && typeof truth.stage === "string") {
    const stageOk =
      norm(meta.stage).includes(norm(truth.stage).slice(0, 10)) ||
      norm(fullText).includes(norm(truth.stage).slice(0, 12));
    fields.push(
      stageOk
        ? field("stage", "pass", truth.stage, meta.stage ?? "(in bundle text)")
        : field("stage", "needs_review", truth.stage, meta.stage ?? "—"),
    );
  }

  if (isNeedsReview(truth.expectedWorkflowProfile)) {
    fields.push(
      field("workflowProfile", "needs_review", NEEDS_REVIEW, workflowProfile, "Confirm expected workflow profile."),
    );
  } else {
    fields.push(
      workflowProfile === truth.expectedWorkflowProfile
        ? field("workflowProfile", "pass", String(truth.expectedWorkflowProfile), workflowProfile)
        : field(
            "workflowProfile",
            "fail",
            String(truth.expectedWorkflowProfile),
            workflowProfile,
            "Workflow profile mismatch.",
          ),
    );
  }

  if (truth.expectedRouteFamily) {
    fields.push(
      chargeFamily === truth.expectedRouteFamily
        ? field("routeFamily", "pass", truth.expectedRouteFamily, chargeFamily ?? "—")
        : field("routeFamily", "fail", truth.expectedRouteFamily, chargeFamily ?? "—"),
    );
  }

  for (const prohibited of truth.prohibitedFamilies ?? []) {
    const hit = chargeFamily === prohibited || workflowProfile === prohibited;
    fields.push(
      hit
        ? field(`prohibited.${prohibited}`, "fail", "must not map", workflowProfile, "Prohibited family mapping.")
        : field(`prohibited.${prohibited}`, "pass", "must not map", chargeFamily ?? workflowProfile),
    );
  }

  if (truth.expectedProvisionalStatus != null) {
    const isProv = isProvisionalWorkflowProfile(workflowProfile);
    fields.push(
      isProv === truth.expectedProvisionalStatus
        ? field("provisionalStatus", "pass", String(truth.expectedProvisionalStatus), String(isProv))
        : field("provisionalStatus", "fail", String(truth.expectedProvisionalStatus), String(isProv)),
    );
  }

  for (const doc of truth.documentTypesExpected ?? []) {
    const present = docTypes.includes(doc);
    fields.push(
      present
        ? field(`doc.${doc}`, "pass", "present", docTypes.join(", "))
        : field(`doc.${doc}`, "fail", "present", docTypes.join(", ") || "none", `Expected ${doc} signal in text.`),
    );
  }

  if (truth.thinBundleExpected != null) {
    if (isNeedsReview(truth.thinBundleExpected)) {
      fields.push(field("thinBundle", "needs_review", NEEDS_REVIEW, String(thin), "Confirm thin bundle flag."));
    } else {
      fields.push(
        thin === truth.thinBundleExpected
          ? field("thinBundle", "pass", String(truth.thinBundleExpected), String(thin))
          : field("thinBundle", "needs_review", String(truth.thinBundleExpected), String(thin)),
      );
    }
  }

  if ((truth.missingMaterialExpected ?? []).length) {
    const minHits = Math.min(2, truth.missingMaterialExpected!.length);
    const ok = missingDetected.length >= minHits || missingDetected.length > 0;
    fields.push(
      ok
        ? field("missingMaterial", "pass", truth.missingMaterialExpected!.join("; "), missingDetected.join("; "))
        : field(
            "missingMaterial",
            "needs_review",
            truth.missingMaterialExpected!.join("; "),
            missingDetected.join("; ") || "none flagged",
          ),
    );
  }

  const hasFail = fields.some((f) => f.status === "fail");
  const hasReview = fields.some((f) => f.status === "needs_review");
  const overall = hasFail ? "fail" : hasReview ? "needs_review" : "pass";

  return {
    bundleId: truth.bundleId,
    label,
    linkStatus: "runnable",
    skipped: false,
    overall,
    fields,
  };
}

function summarizePack(
  pack: string,
  entries: BundleFidelityGoldEntry[],
): import("./bundle-fidelity-types").BundleFidelitySummary {
  const results = entries.map(runBundleFidelityCheck);
  const runnable = results.filter((r) => !r.skipped);
  return {
    generatedAt: new Date().toISOString(),
    pack,
    total: results.length,
    runnable: runnable.length,
    passed: runnable.filter((r) => r.overall === "pass").length,
    failed: runnable.filter((r) => r.overall === "fail").length,
    needsReview: runnable.filter((r) => r.overall === "needs_review").length,
    skipped: results.filter((r) => r.skipped).length,
    results,
  };
}

export function runGoldPack(): import("./bundle-fidelity-types").BundleFidelitySummary {
  return summarizePack("gold", loadGoldPack());
}

export function runLocalPack(): {
  summary: import("./bundle-fidelity-types").BundleFidelitySummary;
  warnings: string[];
} {
  const { entries, warnings } = loadLocalPack();
  return { summary: summarizePack("local", entries), warnings };
}
