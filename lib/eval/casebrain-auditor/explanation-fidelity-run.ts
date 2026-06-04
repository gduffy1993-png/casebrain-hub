import type { BundleFidelityGoldEntry } from "./bundle-fidelity-pack";
import { loadGoldPack, readBundleText } from "./bundle-fidelity-pack";
import { loadLocalPack } from "./bundle-fidelity-local";
import { generateExplanationFidelity } from "./explanation-fidelity-generate";
import {
  evaluateExplanationCase,
  loadGoldExplanationExpect,
} from "./explanation-fidelity-expect";
import type {
  ExplanationFidelityCaseResult,
  ExplanationFidelitySummary,
} from "./explanation-fidelity-types";

function runGoldCase(entry: BundleFidelityGoldEntry): ExplanationFidelityCaseResult {
  const truth = entry.truthKey;
  const label = truth.label ?? truth.bundleId;
  const linkStatus = truth.linkStatus ?? "runnable";

  if (linkStatus === "linked-only" || entry.bundleTextPaths.length === 0) {
    const reason =
      linkStatus === "linked-only"
        ? "Linked-only bundle — explanation fidelity runs when bundle text is exported."
        : "No bundle text paths — cannot explain without source text.";
    return {
      bundleId: truth.bundleId,
      label,
      linkStatus,
      skipped: true,
      skipReason: reason,
      overall: "skipped",
      bundleTextChars: 0,
      sections: generateExplanationFidelity(""),
    };
  }

  const text = readBundleText(entry.bundleTextPaths);
  const sections = generateExplanationFidelity(text);
  const expect = loadGoldExplanationExpect(truth.bundleId);

  if (!expect) {
    return {
      bundleId: truth.bundleId,
      label,
      linkStatus: "runnable",
      skipped: false,
      overall: "needs_review",
      scaffoldNote: "No gold explanation expect file (3.5b).",
      bundleTextChars: text.length,
      sections,
    };
  }

  const { failures } = evaluateExplanationCase(truth.bundleId, text);
  const overall = failures.length ? "fail" : "pass";

  return {
    bundleId: truth.bundleId,
    label,
    linkStatus: "runnable",
    skipped: false,
    overall,
    scaffoldNote: failures.length ? failures.slice(0, 5).join("; ") : undefined,
    bundleTextChars: text.length,
    sections,
  };
}

function runLocalCase(entry: BundleFidelityGoldEntry): ExplanationFidelityCaseResult {
  const truth = entry.truthKey;
  const label = truth.label ?? truth.bundleId;
  const linkStatus = truth.linkStatus ?? "runnable";

  if (linkStatus === "linked-only" || entry.bundleTextPaths.length === 0) {
    return {
      bundleId: truth.bundleId,
      label,
      linkStatus,
      skipped: true,
      skipReason: "No bundle text — ingest PDFs first.",
      overall: "skipped",
      bundleTextChars: 0,
      sections: generateExplanationFidelity(""),
    };
  }

  const text = readBundleText(entry.bundleTextPaths);
  const sections = generateExplanationFidelity(text);
  return {
    bundleId: truth.bundleId,
    label,
    linkStatus: "runnable",
    skipped: false,
    overall: "needs_review",
    scaffoldNote: "Local pack: generator only until 3.5c explanation-expect.json on disk.",
    bundleTextChars: text.length,
    sections,
  };
}

function summarizePack(
  pack: "gold" | "local",
  entries: BundleFidelityGoldEntry[],
  runCase: (e: BundleFidelityGoldEntry) => ExplanationFidelityCaseResult,
): ExplanationFidelitySummary {
  const results = entries.map(runCase);
  const runnable = results.filter((r) => !r.skipped);

  return {
    generatedAt: new Date().toISOString(),
    pack,
    phase: pack === "gold" ? "3.5b" : "3.5b-local-generator",
    total: results.length,
    runnable: runnable.length,
    scaffolded: 0,
    passed: runnable.filter((r) => r.overall === "pass").length,
    failed: runnable.filter((r) => r.overall === "fail").length,
    needsReview: runnable.filter((r) => r.overall === "needs_review").length,
    skipped: results.filter((r) => r.skipped).length,
    results,
  };
}

export function runExplanationGoldPack(): ExplanationFidelitySummary {
  return summarizePack("gold", loadGoldPack(), runGoldCase);
}

export function runExplanationLocalPack(): {
  summary: ExplanationFidelitySummary;
  warnings: string[];
} {
  const { entries, warnings } = loadLocalPack();
  return { summary: summarizePack("local", entries, runLocalCase), warnings };
}
