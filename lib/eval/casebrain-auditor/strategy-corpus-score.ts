import { extractBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import { generateBattleboardView, lintBattleboardViewResult } from "./battleboard-view-generate";
import { generateExplanationFidelity } from "./explanation-fidelity-generate";
import { generateProofMap } from "./proof-map-generate";
import { generateWarRoomView, lintWarRoomViewResult } from "./war-room-view-generate";
import { evaluateAntiTautology } from "./strategy-corpus-anti-tautology";
import type { CorpusCaseScore, CorpusScoreCheck, StrategyCorpusManifest } from "./strategy-corpus-types";
import { FORBIDDEN_CORPUS_PHRASES } from "./strategy-corpus-types";

function lintForbidden(text: string): string[] {
  const lower = text.toLowerCase();
  return FORBIDDEN_CORPUS_PHRASES.filter((p) => lower.includes(p));
}

function allStackText(parts: string[]): string {
  return parts.join(" ");
}

export function scoreCorpusCase(
  manifest: StrategyCorpusManifest,
  bundleText: string,
): CorpusCaseScore {
  const label = `Synthetic ${manifest.caseId} — ${manifest.offenceFamily}`;
  const checks: CorpusScoreCheck[] = [];
  const failures: string[] = [];
  const fingerprints: string[] = [...manifest.fingerprintTags];

  const meta = extractBundleCaseMetadata(bundleText);
  const metaOk =
    Boolean(meta.defendantName || meta.offenceWording) &&
    Boolean(meta.offenceWording || manifest.chargeWording);
  checks.push({
    id: "metadata_present",
    pass: metaOk,
    detail: metaOk ? "defendant/charge metadata extracted" : "metadata thin or missing",
  });
  if (!metaOk) {
    failures.push("metadata: defendant or charge not extracted");
    fingerprints.push("fp:metadata-thin");
  }

  const explanation = generateExplanationFidelity(bundleText);
  const issueCount = explanation.reduce(
    (n, s) => n + s.blocks.length + s.contradictions.length,
    0,
  );
  const explanationOk = issueCount > 0 || manifest.failureModeTags.includes("thin_bundle");
  checks.push({
    id: "explanation_issues",
    pass: explanationOk,
    detail: `${issueCount} explanation issue(s)`,
  });
  if (!explanationOk) {
    failures.push("explanation: no issues generated");
    fingerprints.push("fp:explanation-empty");
  }

  const proofMap = generateProofMap(manifest.caseId, label, bundleText);
  const proofPointsOk = proofMap.proofPoints.length >= manifest.expectations.minProofPoints;
  checks.push({
    id: "proof_map_proof_points",
    pass: proofPointsOk,
    detail: `${proofMap.proofPoints.length} proof point(s); lens=${proofMap.offenceLens}`,
  });
  if (!proofPointsOk) {
    failures.push(`proof map: ${proofMap.proofPoints.length} proof points < min ${manifest.expectations.minProofPoints}`);
    fingerprints.push("fp:proof-points-thin");
  }

  const lensOk =
    proofMap.offenceLens === manifest.expectations.expectedOffenceLens ||
    (manifest.expectations.expectedOffenceLens === "violence_gbh" &&
      proofMap.offenceLens === "violence_gbh");
  if (!lensOk) {
    checks.push({
      id: "proof_map_lens",
      pass: false,
      detail: `expected ${manifest.expectations.expectedOffenceLens}, got ${proofMap.offenceLens}`,
    });
    failures.push(`proof map lens mismatch: ${proofMap.offenceLens}`);
    fingerprints.push("fp:lens-mismatch");
  } else {
    checks.push({ id: "proof_map_lens", pass: true });
  }

  const missingLinks = proofMap.links.filter(
    (l) => l.linkType === "missing" || l.linkType === "disclosure_chase",
  );
  const missingOk =
    manifest.missingMaterial.length === 0 ||
    missingLinks.length > 0 ||
    proofMap.links.some((l) => l.disclosureChase?.trim());
  checks.push({
    id: "missing_linked_disclosure",
    pass: missingOk,
    detail: `${missingLinks.length} missing/disclosure link(s)`,
  });
  if (!missingOk) {
    failures.push("missing material not linked to disclosure chase on proof map");
    fingerprints.push("fp:missing-not-linked");
  }

  const contraLinks = proofMap.links.filter((l) => l.linkType === "contradiction");
  const contraOk = manifest.contradictions.length === 0 || contraLinks.length > 0;
  checks.push({
    id: "contradictions_linked",
    pass: contraOk,
    detail: `${contraLinks.length} contradiction link(s)`,
  });
  if (!contraOk) {
    failures.push("manifest contradictions not reflected on proof map");
    fingerprints.push("fp:contradiction-gap");
  }

  const battleboard = generateBattleboardView(proofMap, bundleText);
  const bbLint = lintBattleboardViewResult(battleboard);
  const bbRouteOk = Boolean(battleboard.primaryRoute?.trim()) && Boolean(battleboard.safeNextAction?.trim());
  checks.push({
    id: "battleboard_route_safe",
    pass: bbRouteOk && bbLint.length === 0,
    detail: bbRouteOk ? battleboard.primaryRoute.slice(0, 80) : "missing route",
  });
  if (!bbRouteOk) {
    failures.push("battleboard: missing primary route or safe next action");
    fingerprints.push("fp:battleboard-route");
  }
  for (const e of bbLint) {
    failures.push(e);
    fingerprints.push("fp:battleboard-lint");
  }

  const warRoom = generateWarRoomView(proofMap);
  const wrLint = lintWarRoomViewResult(warRoom);
  const wrLineOk =
    Boolean(warRoom.safeHearingLine?.trim()) &&
    /provisional|papers/i.test(warRoom.safeHearingLine);
  checks.push({
    id: "war_room_safe_hearing_line",
    pass: wrLineOk && wrLint.length === 0,
    detail: wrLineOk ? "safe hearing line present" : "missing provisional hearing line",
  });
  if (!wrLineOk) {
    failures.push("war room: safe hearing line missing or not provisional");
    fingerprints.push("fp:war-room-line");
  }
  for (const e of wrLint) {
    failures.push(e);
    fingerprints.push("fp:war-room-lint");
  }

  const doNotOverstateOk =
    Boolean(warRoom.doNotOverstate?.trim()) &&
    Boolean(battleboard.doNotOverstateWarning?.trim()) &&
    proofMap.proofPoints.every((p) => p.doNotOverstate?.trim());
  checks.push({
    id: "do_not_overstate",
    pass: doNotOverstateOk,
  });
  if (!doNotOverstateOk) {
    failures.push("do-not-overstate missing on stack output");
    fingerprints.push("fp:do-not-overstate");
  }

  const serious =
    manifest.offenceFamily === "generic_provisional" ||
    manifest.offenceFamily === "violence_gbh_s18" ||
    manifest.expectations.requiresHumanReviewWhenSerious ||
    manifest.failureModeTags.includes("self_defence_pattern") ||
    /section\s*18|intent|wounding with intent|witness intimidation|serious offence|provisional charge/i.test(
      manifest.chargeWording,
    );
  const reviewOk =
    !serious ||
    warRoom.solicitorReviewRequired ||
    battleboard.humanReviewRequired ||
    proofMap.humanReviewRequired;
  checks.push({
    id: "human_review_when_serious",
    pass: reviewOk,
    detail: serious ? "serious/provisional case flagged for review" : "n/a",
  });
  if (!reviewOk) {
    failures.push("serious/provisional case without human review flag");
    fingerprints.push("fp:human-review-gap");
  }

  const blob = allStackText([
    proofMap.proofPoints.map((p) => p.doNotOverstate).join(" "),
    proofMap.links.map((l) => `${l.label} ${l.routeImpact ?? ""} ${l.doNotOverstate}`).join(" "),
    battleboard.primaryRoute,
    battleboard.whyRouteIsLive,
    battleboard.safeNextAction,
    battleboard.doNotOverstateWarning,
    warRoom.safeHearingLine,
    warRoom.doNotOverstate,
    ...warRoom.doNotConcede,
  ]);
  const forbidden = lintForbidden(blob);
  checks.push({
    id: "no_forbidden_phrases",
    pass: forbidden.length === 0,
    detail: forbidden.length ? forbidden.join(", ") : "clean",
  });
  if (forbidden.length) {
    failures.push(`forbidden phrasing: ${forbidden.join(", ")}`);
    fingerprints.push("fp:forbidden-phrase");
  }

  const antiTautology = evaluateAntiTautology(manifest.caseId, label, bundleText);
  checks.push(...antiTautology.checks);
  for (const f of antiTautology.failures) {
    failures.push(f);
    fingerprints.push("fp:anti-tautology");
  }

  const failCount = checks.filter((c) => !c.pass).length;
  const overall: CorpusCaseScore["overall"] =
    failCount === 0 ? "pass" : failCount <= 2 ? "weak" : "fail";

  return {
    caseId: manifest.caseId,
    seed: manifest.seed,
    split: manifest.split,
    offenceFamily: manifest.offenceFamily,
    recipeId: manifest.recipeId,
    failureModeTags: manifest.failureModeTags,
    overall,
    checks,
    fingerprints: [...new Set(fingerprints)],
    failures,
    bundleTextChars: bundleText.length,
    proofPointCount: proofMap.proofPoints.length,
    missingLinkCount: missingLinks.length,
    contradictionLinkCount: contraLinks.length,
    humanReviewRequired:
      warRoom.solicitorReviewRequired ||
      battleboard.humanReviewRequired ||
      proofMap.humanReviewRequired,
  };
}
