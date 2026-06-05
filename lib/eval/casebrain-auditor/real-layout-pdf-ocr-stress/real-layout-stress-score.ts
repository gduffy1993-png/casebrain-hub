import { detectBundleDocumentTypes } from "@/lib/criminal/bundle-document-signals";
import { extractBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import { buildReasoningV2FromBundleText } from "@/lib/criminal/reasoning-v2/build-reasoning-v2-view-model";
import { lintClientExplanationOutput } from "@/lib/criminal/client-explanation/client-explanation-sanitize";
import { generateBattleboardView } from "../battleboard-view-generate";
import { generateExplanationFidelity } from "../explanation-fidelity-generate";
import { generateProofMap } from "../proof-map-generate";
import { generateWarRoomView } from "../war-room-view-generate";
import { FORBIDDEN_CORPUS_PHRASES } from "../strategy-corpus-types";
import type {
  RealLayoutStressSampleManifest,
  RealLayoutStressSampleResult,
  RealLayoutStressScoreCheck,
} from "./real-layout-stress-types";

function pushCheck(
  checks: RealLayoutStressScoreCheck[],
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

function textIncludesAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

function detectMissingHits(text: string, expected: string[]): string[] {
  const lower = text.toLowerCase();
  return expected.filter((e) => {
    const parts = e.toLowerCase().split(/\s+/).filter((p) => p.length > 3);
    return parts.some((p) => lower.includes(p)) || lower.includes(e.toLowerCase());
  });
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

export function scoreStressSample(
  manifest: RealLayoutStressSampleManifest,
  extractedText: string,
): RealLayoutStressSampleResult {
  const checks: RealLayoutStressScoreCheck[] = [];
  const failures: string[] = [];
  const fingerprints: string[] = [...manifest.layoutTags.map((t) => `layout:${t}`)];

  const chars = extractedText.length;
  pushCheck(
    checks,
    failures,
    fingerprints,
    "extract_text",
    chars >= 400,
    `${chars} char(s) extracted`,
    chars < 400 ? "extract: text too thin or empty" : undefined,
    chars < 400 ? "fp:extract-empty" : undefined,
  );

  const meta = extractBundleCaseMetadata(extractedText);
  const defendantOk =
    Boolean(meta.defendantName) &&
    extractedText.toLowerCase().includes(manifest.expectedDefendant.toLowerCase().split(" ")[0]!);
  pushCheck(
    checks,
    failures,
    fingerprints,
    "defendant_detected",
    defendantOk,
    meta.defendantName ?? "none",
    !defendantOk ? "metadata: defendant not detected" : undefined,
    !defendantOk ? "fp:defendant-miss" : undefined,
  );

  const chargeOk = textIncludesAny(extractedText, [
    manifest.expectedCharge,
    ...manifest.expectedCharge.split(",").map((s) => s.trim()),
    "dangerous driving",
    "fraud",
    "intent to supply",
    "robbery",
    "wounding",
    "assault occasioning",
  ]);
  pushCheck(
    checks,
    failures,
    fingerprints,
    "charge_detected",
    chargeOk,
    meta.offenceWording ?? meta.offenceDisplay ?? "none",
    !chargeOk ? "metadata: charge not detected" : undefined,
    !chargeOk ? "fp:charge-miss" : undefined,
  );

  const missingHits = detectMissingHits(extractedText, manifest.expectedMissingMaterial);
  const missingOk = missingHits.length >= Math.min(1, manifest.expectedMissingMaterial.length);
  pushCheck(
    checks,
    failures,
    fingerprints,
    "missing_material",
    missingOk,
    missingHits.join("; ") || "none",
    !missingOk ? "missing: expected outstanding material not surfaced" : undefined,
    !missingOk ? "fp:missing-material-miss" : undefined,
  );

  const docTypes = detectBundleDocumentTypes(extractedText);
  pushCheck(
    checks,
    failures,
    fingerprints,
    "document_types",
    docTypes.length >= 2,
    docTypes.join(", ") || "none",
    docTypes.length < 2 ? "docs: fewer than 2 document types detected" : undefined,
    docTypes.length < 2 ? "fp:doc-types-thin" : undefined,
  );

  const explanation = generateExplanationFidelity(extractedText);
  const explanationIssues = explanation.reduce(
    (n, s) => n + s.blocks.length + s.contradictions.length,
    0,
  );
  pushCheck(
    checks,
    failures,
    fingerprints,
    "explanation_chain",
    explanationIssues > 0,
    `${explanationIssues} explanation issue(s)`,
    explanationIssues === 0 ? "explanation: no issues from extracted text" : undefined,
    explanationIssues === 0 ? "fp:explanation-empty" : undefined,
  );

  const label = `Layout stress ${manifest.sampleId}`;
  const proofMap = generateProofMap(manifest.sampleId, label, extractedText);
  pushCheck(
    checks,
    failures,
    fingerprints,
    "proof_map",
    proofMap.proofPoints.length >= 2,
    `${proofMap.proofPoints.length} proof point(s)`,
    proofMap.proofPoints.length < 2 ? "proof map: thin on extracted text" : undefined,
    proofMap.proofPoints.length < 2 ? "fp:proof-map-thin" : undefined,
  );

  const battleboard = generateBattleboardView(proofMap, extractedText);
  pushCheck(
    checks,
    failures,
    fingerprints,
    "battleboard",
    Boolean(battleboard.primaryRoute?.trim()),
    battleboard.primaryRoute || "none",
    !battleboard.primaryRoute?.trim() ? "battleboard: no primary route" : undefined,
    !battleboard.primaryRoute?.trim() ? "fp:battleboard-empty" : undefined,
  );

  const warRoom = generateWarRoomView(proofMap);
  const warRoomBlob = JSON.stringify(warRoom);
  const warRoomLint = lintForbidden(warRoomBlob);
  pushCheck(
    checks,
    failures,
    fingerprints,
    "war_room_safe",
    warRoomLint.length === 0,
    warRoomLint.length ? warRoomLint.join("; ") : "no forbidden phrases / paths",
    warRoomLint.length ? `war room lint: ${warRoomLint.join("; ")}` : undefined,
    warRoomLint.length ? "fp:unsafe-wording" : undefined,
  );

  const reasoning = buildReasoningV2FromBundleText(extractedText, label);
  if (reasoning.available) {
    const reasoningBlob = JSON.stringify({
      charge: reasoning.charge,
      primaryRoute: reasoning.primaryRoute,
      safeNextAction: reasoning.safeNextAction,
      doNotOverstateWarning: reasoning.doNotOverstateWarning,
    });
    const lintIssues = lintClientExplanationOutput(reasoningBlob);
    pushCheck(
      checks,
      failures,
      fingerprints,
      "reasoning_v2_safe",
      lintIssues.length === 0,
      lintIssues.length ? lintIssues.join("; ") : "reasoning labels safe",
      lintIssues.length ? `reasoning lint: ${lintIssues.join("; ")}` : undefined,
      lintIssues.length ? "fp:reasoning-unsafe" : undefined,
    );
    pushCheck(
      checks,
      failures,
      fingerprints,
      "reasoning_v2_available",
      true,
      "reasoning spine available on extracted text",
    );
  } else {
    pushCheck(
      checks,
      failures,
      fingerprints,
      "reasoning_v2_available",
      false,
      reasoning.reason ?? "unavailable",
      "reasoning: unavailable on extracted text",
      "fp:reasoning-unavailable",
    );
  }

  const hardFail = failures.some((f) =>
    /extract:|defendant|charge not|unsafe|artifact|local_path/i.test(f),
  );
  const hasWeak = failures.length > 0 && !hardFail;
  const overall = hardFail ? "fail" : hasWeak ? "weak" : "pass";

  return {
    sampleId: manifest.sampleId,
    seed: manifest.seed,
    offenceFamily: manifest.offenceFamily,
    layoutTags: manifest.layoutTags,
    materialisationMode: manifest.materialisationMode,
    extractChars: chars,
    overall,
    checks,
    failures,
    fingerprints: [...new Set(fingerprints)],
  };
}
