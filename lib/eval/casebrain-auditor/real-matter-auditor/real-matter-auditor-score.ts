import { detectBundleDocumentTypes } from "@/lib/criminal/bundle-document-signals";
import { extractBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import { buildReasoningV2FromBundleText } from "@/lib/criminal/reasoning-v2/build-reasoning-v2-view-model";
import { lintClientExplanationOutput } from "@/lib/criminal/client-explanation/client-explanation-sanitize";
import { buildPreHearingReadiness } from "@/lib/criminal/pre-hearing-readiness/build-pre-hearing-readiness";
import { generateBattleboardView } from "../battleboard-view-generate";
import { generateExplanationFidelity } from "../explanation-fidelity-generate";
import { generateProofMap } from "../proof-map-generate";
import { generateWarRoomView } from "../war-room-view-generate";
import { FORBIDDEN_CORPUS_PHRASES } from "../strategy-corpus-types";
import type {
  RealMatterCaseResult,
  RealMatterHumanTruth,
  RealMatterLocalManifest,
  RealMatterOverall,
  RealMatterScoreCheck,
} from "./real-matter-auditor-types";

const THIN_THRESHOLD = 800;

function pushCheck(
  checks: RealMatterScoreCheck[],
  failures: string[],
  fingerprints: string[],
  id: string,
  pass: boolean,
  detail: string,
  failMsg?: string,
  fp?: string,
): void {
  checks.push({ id, pass, detail });
  if (!pass) {
    if (failMsg) failures.push(failMsg);
    if (fp) fingerprints.push(fp);
  }
}

function lintForbidden(blob: string): string[] {
  const lower = blob.toLowerCase();
  const issues: string[] = [];
  for (const phrase of FORBIDDEN_CORPUS_PHRASES) {
    if (lower.includes(phrase)) issues.push(`forbidden:${phrase}`);
  }
  if (blob.includes("artifacts/")) issues.push("artifact_path");
  if (/\b[a-z]:\\/.test(blob)) issues.push("local_path");
  return issues;
}

function detectMissingHits(text: string, expected: string[]): string[] {
  const lower = text.toLowerCase();
  return expected.filter((e) => {
    const parts = e.toLowerCase().split(/\s+/).filter((p) => p.length > 3);
    return parts.some((p) => lower.includes(p)) || lower.includes(e.toLowerCase());
  });
}

function scoreStrictTruth(
  truth: RealMatterHumanTruth,
  meta: ReturnType<typeof extractBundleCaseMetadata>,
  text: string,
  checks: RealMatterScoreCheck[],
  failures: string[],
  fingerprints: string[],
): number {
  let matched = 0;
  let total = 0;

  if (truth.defendant) {
    total++;
    const ok =
      Boolean(meta.defendantName) &&
      text.toLowerCase().includes(truth.defendant.toLowerCase().split(" ").pop() ?? "");
    if (ok) matched++;
    pushCheck(
      checks,
      failures,
      fingerprints,
      "strict_defendant",
      ok,
      meta.defendantName ?? "none",
      !ok ? "strict: defendant mismatch" : undefined,
      !ok ? "fp:defendant-confusion-real" : undefined,
    );
  }

  if (truth.charge) {
    total++;
    const ok = text.toLowerCase().includes(truth.charge.toLowerCase().slice(0, 24));
    if (ok) matched++;
    pushCheck(
      checks,
      failures,
      fingerprints,
      "strict_charge",
      ok,
      meta.offenceWording ?? meta.offenceDisplay ?? "none",
      !ok ? "strict: charge mismatch" : undefined,
      !ok ? "fp:charge-not-detected-real" : undefined,
    );
  }

  if (truth.missingMaterialExpected?.length) {
    total++;
    const hits = detectMissingHits(text, truth.missingMaterialExpected);
    const ok = hits.length >= Math.min(1, truth.missingMaterialExpected.length);
    if (ok) matched++;
    pushCheck(
      checks,
      failures,
      fingerprints,
      "strict_missing",
      ok,
      hits.join("; ") || "none",
      !ok ? "strict: missing material not surfaced" : undefined,
      !ok ? "fp:missing-material-miss-real" : undefined,
    );
  }

  return total ? matched : 0;
}

export function scoreRealMatterCase(
  manifest: RealMatterLocalManifest,
  bundleText: string,
  inputSource: "bundle-text" | "bundle-pdf-extract" | "none",
  options: {
    mode: "discovery" | "strict-truth";
    humanTruth: RealMatterHumanTruth | null;
    extractError?: string;
  },
): RealMatterCaseResult {
  const checks: RealMatterScoreCheck[] = [];
  const failures: string[] = [];
  const fingerprints: string[] = [];
  const chars = bundleText.length;
  const mode = options.mode;

  if (options.extractError) {
    fingerprints.push("fp:ocr-layout-noise-real");
  }

  if (!options.humanTruth && mode === "discovery") {
    fingerprints.push("fp:real-matter-no-truth-file");
  }

  const thin = chars < THIN_THRESHOLD;
  pushCheck(
    checks,
    failures,
    fingerprints,
    "input_text",
    !thin && chars > 0,
    `${chars} char(s) from ${inputSource}`,
    thin || chars === 0 ? "input thin or empty" : undefined,
    thin || chars === 0 ? "fp:real-text-thin" : undefined,
  );

  const meta = extractBundleCaseMetadata(bundleText);
  let metadataStatus: RealMatterCaseResult["metadataStatus"] = "ok";
  if (thin || chars === 0) metadataStatus = "thin";
  else if (!meta.defendantName && !meta.offenceWording) metadataStatus = "needs_review";
  else if (!meta.defendantName || !meta.offenceWording) metadataStatus = "uncertain";

  const defendantDetected = Boolean(meta.defendantName);
  pushCheck(
    checks,
    failures,
    fingerprints,
    "defendant_detected",
    defendantDetected || mode === "discovery",
    meta.defendantName ?? "none",
    !defendantDetected && mode === "strict-truth"
      ? "defendant not detected"
      : !defendantDetected
        ? "defendant uncertain — needs review"
        : undefined,
    !defendantDetected ? "fp:defendant-confusion-real" : undefined,
  );

  const chargeDetected = Boolean(meta.offenceWording || meta.offenceDisplay);
  pushCheck(
    checks,
    failures,
    fingerprints,
    "charge_detected",
    chargeDetected || mode === "discovery",
    meta.offenceWording ?? meta.offenceDisplay ?? "none",
    !chargeDetected && mode === "strict-truth" ? "charge not detected" : undefined,
    !chargeDetected ? "fp:charge-not-detected-real" : undefined,
  );

  const docTypes = detectBundleDocumentTypes(bundleText);
  const expectedDocs = manifest.documentTypesExpected ?? [];
  if (expectedDocs.length) {
    for (const doc of expectedDocs) {
      const present = docTypes.includes(doc);
      pushCheck(
        checks,
        failures,
        fingerprints,
        `doc.${doc}`,
        present || mode === "discovery",
        present ? "present" : "not detected",
        !present && mode === "strict-truth" ? `expected doc ${doc}` : undefined,
        !present ? "fp:document-type-miss-real" : undefined,
      );
    }
  }

  const knownMissing = manifest.knownMissingMaterial ?? [];
  if (knownMissing.length) {
    const hits = detectMissingHits(bundleText, knownMissing);
    const surfaced = hits.length > 0;
    pushCheck(
      checks,
      failures,
      fingerprints,
      "missing_material",
      surfaced || mode === "discovery",
      hits.join("; ") || "none flagged in text",
      !surfaced && mode === "strict-truth" ? "known missing not surfaced" : undefined,
      !surfaced ? "fp:missing-material-miss-real" : undefined,
    );
  }

  const knownContradictions = manifest.knownContradictions ?? [];
  if (knownContradictions.length) {
    const surfaced = knownContradictions.some((c) =>
      bundleText.toLowerCase().includes(c.toLowerCase().slice(0, 20)),
    );
    pushCheck(
      checks,
      failures,
      fingerprints,
      "contradictions",
      surfaced || mode === "discovery",
      surfaced ? "signals present" : "not clearly surfaced",
      !surfaced && mode === "strict-truth" ? "contradiction not surfaced" : undefined,
      !surfaced ? "fp:contradiction-miss-real" : undefined,
    );
  }

  let spineRan = false;
  let humanReviewRequired = thin || metadataStatus !== "ok";

  if (chars >= 200 && !thin) {
    const explanation = generateExplanationFidelity(bundleText);
    const issueCount = explanation.reduce(
      (n, s) => n + s.blocks.length + s.contradictions.length,
      0,
    );
    pushCheck(
      checks,
      failures,
      fingerprints,
      "explanation_issues",
      issueCount > 0,
      `${issueCount} issue(s)`,
    );

    const label = manifest.anonymisedLabel;
    const proofMap = generateProofMap(manifest.localId, label, bundleText);
    spineRan = proofMap.proofPoints.length > 0;

    pushCheck(
      checks,
      failures,
      fingerprints,
      "proof_map",
      proofMap.proofPoints.length >= 1,
      `${proofMap.proofPoints.length} proof point(s)`,
    );

    const battleboard = generateBattleboardView(proofMap, bundleText);
    pushCheck(
      checks,
      failures,
      fingerprints,
      "battleboard",
      Boolean(battleboard.primaryRoute?.trim()) || thin,
      battleboard.primaryRoute || "blocked",
    );

    const warRoom = generateWarRoomView(proofMap);
    const warLint = lintForbidden(JSON.stringify(warRoom));
    pushCheck(
      checks,
      failures,
      fingerprints,
      "war_room_safe",
      warLint.length === 0,
      warLint.length ? warLint.join("; ") : "safe",
      warLint.length ? "unsafe war room wording" : undefined,
      warLint.length ? "fp:strategy-overconfident-real" : undefined,
    );

    const reasoning = buildReasoningV2FromBundleText(bundleText, label);
    if (reasoning.available) {
      const blob = JSON.stringify({
        charge: reasoning.charge,
        primaryRoute: reasoning.primaryRoute,
        doNotOverstateWarning: reasoning.doNotOverstateWarning,
      });
      const lintIssues = lintClientExplanationOutput(blob);
      pushCheck(
        checks,
        failures,
        fingerprints,
        "reasoning_v2_safe",
        lintIssues.length === 0,
        lintIssues.length ? lintIssues.join("; ") : "safe",
      );
      if (thin || metadataStatus === "thin") {
        fingerprints.push("fp:strategy-overconfident-real");
        failures.push("reasoning available on thin input");
      }

      const readiness = buildPreHearingReadiness(reasoning, null, {
        bundleMeta: { documentCount: docTypes.length, combinedTextLength: chars },
      });
      if (readiness.available && (readiness.level === "red" || readiness.level === "amber")) {
        humanReviewRequired = true;
      }
    } else if (!thin) {
      pushCheck(checks, failures, fingerprints, "reasoning_v2", true, "blocked or unavailable");
    }
  } else {
    pushCheck(checks, failures, fingerprints, "spine_blocked", true, "thin/empty — spine skipped");
    if (metadataStatus === "thin" || metadataStatus === "needs_review") {
      fingerprints.push("fp:needs-review-correct-real");
    }
  }

  if (options.humanTruth && mode === "strict-truth") {
    scoreStrictTruth(options.humanTruth, meta, bundleText, checks, failures, fingerprints);
  }

  if (humanReviewRequired && (thin || !defendantDetected || !chargeDetected)) {
    fingerprints.push("fp:source-gap-not-flagged-real");
  }

  const hasHardFail = failures.some((f) => /unsafe|forbidden|strict:/i.test(f));
  const hasWeak = failures.length > 0 && !hasHardFail;

  let overall: RealMatterOverall = "pass";
  if (hasHardFail) overall = "fail";
  else if (humanReviewRequired && (thin || metadataStatus !== "ok")) overall = "needs_review";
  else if (metadataStatus === "uncertain") overall = "uncertain";
  else if (hasWeak) overall = "weak";

  if (thin && overall === "pass") overall = "needs_review";

  return {
    localId: manifest.localId,
    anonymisedLabel: manifest.anonymisedLabel,
    offenceFamily: manifest.offenceFamily,
    holdout: Boolean(manifest.holdout),
    mode,
    inputSource,
    extractChars: chars,
    overall,
    metadataStatus,
    spineRan,
    checks,
    failures,
    fingerprints: [...new Set(fingerprints)],
    humanReviewRequired,
  };
}
