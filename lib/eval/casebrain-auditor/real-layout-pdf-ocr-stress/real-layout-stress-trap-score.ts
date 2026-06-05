import { extractBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import type {
  RealLayoutStressSampleManifest,
  RealLayoutStressSampleResult,
  RealLayoutTrapOutcome,
} from "./real-layout-stress-types";

function hasIndexBodyMismatch(text: string): boolean {
  const indexSaysMg11 = /INDEX.*MG11.*PRESENT|MG11 witness statement.*PRESENT/i.test(text);
  const bodyHasMg11 = /MG11 WITNESS STATEMENT/i.test(text);
  return indexSaysMg11 && !bodyHasMg11;
}

function reasoningMentionsMissing(text: string, items: string[]): boolean {
  const lower = text.toLowerCase();
  return items.some((item) => {
    const parts = item.toLowerCase().split(/\s+/).filter((p) => p.length > 3);
    return parts.some((p) => lower.includes(p));
  });
}

export function applyTrapScoring(
  manifest: RealLayoutStressSampleManifest,
  extractedText: string,
  base: RealLayoutStressSampleResult,
  reasoningAvailable: boolean,
  reasoningBlob: string,
): RealLayoutStressSampleResult {
  const trap = manifest.trapProfile;
  if (!trap) {
    return {
      ...base,
      trapOutcome: {
        expectedTier: null,
        expectedFingerprints: [],
        actualFingerprints: [],
        trapMatched: false,
      },
    };
  }

  const trapFps: string[] = [];
  const chargeCheck = base.checks.find((c) => c.id === "charge_detected");
  const missingCheck = base.checks.find((c) => c.id === "missing_material");
  const defendantCheck = base.checks.find((c) => c.id === "defendant_detected");
  const meta = extractBundleCaseMetadata(extractedText);

  if (trap.chargeObscured && chargeCheck?.pass) {
    trapFps.push("fp:charge-obscured");
  }

  if (trap.indexListsMissingOnly) {
    const indexHasMissing = manifest.expectedMissingMaterial.some((m) =>
      extractedText.toLowerCase().includes(m.toLowerCase().split(" ")[0]!),
    );
    const pipelineSurfaced =
      missingCheck?.pass ||
      reasoningMentionsMissing(reasoningBlob, manifest.expectedMissingMaterial);
    if (indexHasMissing && !pipelineSurfaced) {
      trapFps.push("fp:missing-material-not-detected");
    }
  }

  if (trap.contradictionLayoutOnly && manifest.expectedContradictions.length) {
    const contradictionSurfaced =
      /unresolved|conflict|contradiction|not agreed/i.test(extractedText) ||
      /contradiction/i.test(reasoningBlob);
    if (!contradictionSurfaced) {
      trapFps.push("fp:contradiction-missed-layout");
    }
  }

  if (manifest.defendantVariants?.length && defendantCheck?.pass) {
    const last = manifest.expectedDefendant.split(" ").pop()?.toLowerCase();
    const detected = meta.defendantName?.toLowerCase() ?? "";
    const variantHit = manifest.defendantVariants.some((v) => detected.includes(v.toLowerCase().split(" ")[0]!));
    if (!detected.includes(last ?? "") && variantHit) {
      trapFps.push("fp:defendant-confusion");
    }
  }

  if (manifest.layoutTags.includes("co_defendant_name_proximity") && manifest.coDefendants?.length) {
    if (defendantCheck?.pass && extractedText.includes(manifest.coDefendants[0]!)) {
      trapFps.push("fp:co-defendant-attribution-risk");
    }
  }

  if (trap.thinScannedUnsafe && base.extractChars < 600 && reasoningAvailable) {
    trapFps.push("fp:thin-scanned-page");
  }

  if (manifest.layoutTags.includes("index_body_mismatch") || hasIndexBodyMismatch(extractedText)) {
    if (hasIndexBodyMismatch(extractedText)) {
      trapFps.push("fp:index-body-mismatch");
    }
  }

  if (manifest.layoutTags.includes("interview_in_custody_log")) {
    const buried =
      /custody/i.test(extractedText) &&
      /interview summary/i.test(extractedText) &&
      !/INTERVIEW SUMMARY \(Fictional\)/i.test(extractedText);
    if (buried && !reasoningBlob.toLowerCase().includes("interview")) {
      trapFps.push("fp:interview-buried-in-custody");
    }
  }

  if (manifest.layoutTags.includes("cctv_export_log_absent")) {
    if (/cctv still/i.test(extractedText) && !/export log/i.test(extractedText.toLowerCase())) {
      if (!missingCheck?.pass) trapFps.push("fp:cctv-stills-no-export-gap");
    }
  }

  if (manifest.layoutTags.includes("continuity_separated")) {
    if (/continuity statement/i.test(extractedText) && !/exhibit schedule/i.test(extractedText.toLowerCase())) {
      trapFps.push("fp:continuity-separated");
    }
  }

  const expected = trap.expectFingerprintsOnMismatch;
  const matched = trapFps.filter((fp) => expected.includes(fp));
  const failures = [...base.failures];
  const fingerprints = [...new Set([...base.fingerprints, ...trapFps])];

  for (const fp of trapFps) {
    failures.push(`trap: ${fp}`);
  }

  let overall = base.overall;

  if (trap.tier === "deliberate_fail") {
    if (trapFps.length) overall = "fail";
    else if (overall === "pass") {
      fingerprints.push("fp:trap-too-clean");
      failures.push("trap: pipeline passed deliberate_fail sample cleanly");
      overall = "weak";
    }
  } else if (trap.tier === "deliberate_weak") {
    if (trapFps.length) overall = overall === "fail" ? "fail" : "weak";
    else if (overall === "pass" && expected.length) {
      fingerprints.push("fp:trap-too-clean");
      failures.push("trap: expected weak signal but pipeline passed cleanly");
      overall = "weak";
    }
  } else if (trap.tier === "hard" && trapFps.length) {
    overall = overall === "pass" ? "weak" : overall;
  }

  const trapOutcome: RealLayoutTrapOutcome = {
    expectedTier: trap.tier,
    expectedFingerprints: expected,
    actualFingerprints: trapFps,
    trapMatched: matched.length > 0,
  };

  return {
    ...base,
    overall,
    failures,
    fingerprints,
    trapOutcome,
  };
}
