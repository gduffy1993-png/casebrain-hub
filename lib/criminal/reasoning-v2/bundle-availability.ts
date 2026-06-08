import {
  REASONING_V2_MIN_BUNDLE_CHARS,
  assembleBundleTextForReasoning,
  type BundleTextInput,
} from "./assemble-bundle-text";
import type { ReasoningV2UnavailableReason } from "./reasoning-v2-types";
import { REASONING_V2_UNAVAILABLE_MESSAGE } from "./reasoning-v2-types";

export type BundleAvailabilityInput = BundleTextInput & {
  combinedTextLength?: number;
};

export type BundleAvailabilityAssessment = {
  bundleText: string;
  unavailableReason?: ReasoningV2UnavailableReason;
};

function hasSnippet(input: BundleTextInput): boolean {
  const s = input.snippets;
  return Boolean(s?.mg5?.trim() || s?.mg6?.trim() || s?.exhibits?.trim());
}

export function assessBundleAvailability(input: BundleAvailabilityInput): BundleAvailabilityAssessment {
  const frontLen = input.frontMatterScan?.trim().length ?? 0;
  const hasSnips = hasSnippet(input);
  const bundleText = assembleBundleTextForReasoning(input);

  if (frontLen === 0 && !hasSnips && (input.combinedTextLength ?? 0) === 0) {
    return { bundleText: "", unavailableReason: "no_bundle_text" };
  }

  if (frontLen === 0 && !hasSnips && bundleText.length < REASONING_V2_MIN_BUNDLE_CHARS) {
    return { bundleText, unavailableReason: "no_source_snippets" };
  }

  if (bundleText.length < REASONING_V2_MIN_BUNDLE_CHARS) {
    return { bundleText, unavailableReason: "no_bundle_text" };
  }

  return { bundleText };
}

export function reasoningV2UnavailableDetail(reason: ReasoningV2UnavailableReason): string {
  switch (reason) {
    case "no_bundle_text":
      return "No bundle text is available on file yet.";
    case "no_source_snippets":
      return "No MG5, MG6, or exhibit source snippets are available yet.";
    case "insufficient_source":
      return "Served material is too thin to build source-backed reasoning on current papers.";
    default:
      return REASONING_V2_UNAVAILABLE_MESSAGE;
  }
}
