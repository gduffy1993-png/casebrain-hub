/**
 * Strategy Normalizer
 * 
 * Converts CriminalStrategy[] into a unified UI DTO used by all panels.
 * Ensures consistent strategy representation across Strategic Intelligence, Tactical Command, etc.
 */

import type { CriminalStrategy } from "./strategy-engine";

export type NormalizedStrategy = {
  id: string;
  title: string;
  label: string; // Short label for badges (e.g., "Intent Downgrade", "Disclosure Pressure")
  why: string; // Why this strategy matters (theory)
  immediateActions: string[]; // Actionable steps solicitor can do tomorrow
  risks: string[];
  dependencies: string[]; // What this strategy depends on (disclosure, evidence, etc.)
  nextDocsToRequest: string[]; // Deterministic list of documents to request
  provisional?: boolean; // true if based on incomplete disclosure
  downgradeTarget?: string | null; // e.g., "s18 → s20 → s47" or null
};

/**
 * Normalize criminal strategies for UI consumption
 */
export function normalizeCriminalStrategies(strategies: CriminalStrategy[]): NormalizedStrategy[] {
  return strategies.map((strategy) => ({
    id: strategy.id,
    title: strategy.title,
    label: extractLabel(strategy.title),
    why: strategy.theory,
    immediateActions: strategy.immediateActions,
    risks: strategy.risks,
    dependencies: strategy.disclosureDependency
      ? ["Disclosure completion", "Outstanding material"]
      : [],
    nextDocsToRequest: generateNextDocsToRequest(strategy),
    provisional: strategy.provisional,
    downgradeTarget: strategy.downgradeTarget,
  }));
}

/**
 * Extract short label from strategy title
 */
function extractLabel(title: string): string {
  // Remove common prefixes/suffixes
  const cleaned = title
    .replace(/^Strategy\s+/i, "")
    .replace(/\s*\(.*?\)/g, "") // Remove parenthetical notes
    .replace(/\s*-\s*.*$/, "") // Remove everything after dash
    .trim();
  
  // Take first 3-4 words max
  const words = cleaned.split(/\s+/);
  return words.slice(0, 4).join(" ") || title;
}

/**
 * Generate deterministic list of documents to request based on strategy type
 */
function generateNextDocsToRequest(strategy: CriminalStrategy): string[] {
  const docs: string[] = [];

  // Intent Downgrade strategy
  if (strategy.id.includes("intent")) {
    docs.push("Full medical causation narrative from prosecution");
    docs.push("CPS intent basis (written confirmation of why s18 not s20)");
    docs.push("Medical records to assess injury severity and mechanism");
    docs.push("Expert evidence on intent (if medical evidence is ambiguous)");
  }

  // Disclosure Pressure strategy
  if (strategy.id.includes("disclosure")) {
    docs.push("Full unedited CCTV + continuity log + download path");
    docs.push("MG6C/D + unused material categories");
    docs.push("Forensic continuity + lab notes + mixture interpretation");
    docs.push("999 call + CAD log + BWV");
    docs.push("All outstanding disclosure material");
  }

  // Identification Attack strategy
  if (strategy.id.includes("identification")) {
    docs.push("Full VIPER pack and procedure documentation");
    docs.push("Facial recognition methodology and confidence scores");
    docs.push("All CCTV footage and continuity evidence");
    docs.push("Officer statement re Code D compliance");
    docs.push("Facial recognition operator notes (if referenced)");
  }

  // PACE Breach strategy
  if (strategy.id.includes("pace")) {
    docs.push("Full custody record");
    docs.push("Interview recording + log");
    docs.push("Solicitor attendance records");
    docs.push("PACE Code C compliance documentation");
    docs.push("All interview-related material");
  }

  // Controlled Plea strategy
  if (strategy.id.includes("plea")) {
    docs.push("Medical clarification on injury mechanism");
    docs.push("Expert evidence on intent before plea");
    docs.push("Sentencing guidelines and credit calculations");
  }

  // Evidence Weakness strategy
  if (strategy.id.includes("evidence-weakness") || strategy.id.includes("no-case")) {
    docs.push("All evidence supporting each element of offence");
    docs.push("Contradictions in prosecution case");
    docs.push("Expert evidence to challenge prosecution case");
  }

  // Disclosure-First strategy (fallback)
  if (strategy.id.includes("disclosure-first")) {
    docs.push("All outstanding disclosure");
    docs.push("MG6 schedules");
    docs.push("Primary media integrity confirmation");
  }

  return docs;
}

/**
 * Filter out civil terms from strategy text (defensive assertion)
 */
export function filterCivilTerms(text: string): { filtered: string; hadCivilTerms: boolean } {
  const civilTerms = [
    "CFA",
    "Conditional Fee Agreement",
    "retainer",
    "engagement letter",
    "Part 36",
    "pre-action protocol",
    "PAP",
    "letter before action",
    "LBA",
    "Part 7",
    "Part 8",
    "costs budget",
    "costs management",
  ];

  let filtered = text;
  let hadCivilTerms = false;

  for (const term of civilTerms) {
    const regex = new RegExp(term, "gi");
    if (regex.test(filtered)) {
      hadCivilTerms = true;
      filtered = filtered.replace(regex, "[CIVIL TERM FILTERED]");
    }
  }

  return { filtered, hadCivilTerms };
}

/**
 * Check if output contains civil terms and return banner if so
 */
export function checkForCivilLeakage(output: string | string[]): {
  hasLeakage: boolean;
  banner?: { severity: "warning"; title: string; message: string };
} {
  const text = Array.isArray(output) ? output.join(" ") : output;
  const { hadCivilTerms, filtered } = filterCivilTerms(text);

  if (hadCivilTerms) {
    return {
      hasLeakage: true,
      banner: {
        severity: "warning",
        title: "Civil terms filtered",
        message: "Pack mismatch detected: civil terms filtered from criminal case output.",
      },
    };
  }

  return { hasLeakage: false };
}

