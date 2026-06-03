import type { AuditorSeverity } from "./types";

export type FingerprintRule = {
  fingerprint: string;
  issueFamily: string;
  severity: AuditorSeverity;
  demoBlocker: boolean;
  patterns: RegExp[];
  expected: string;
  suggestedSharedFix: string;
  likelyFiles?: string[];
};

export const UNIVERSAL_WORDING_RULES: FingerprintRule[] = [
  {
    fingerprint: "wording.duplicate_conditional",
    issueFamily: "wording",
    severity: "LOW",
    demoBlocker: false,
    patterns: [/conditional\s*[-–—,]\s*conditional\s+on/i],
    expected: "Single conditional phrasing.",
    suggestedSharedFix: "pilotRouteStatusBadgeLabel / cleanupPilotVisiblePunctuation.",
    likelyFiles: ["lib/criminal/pilot-workflow.ts"],
  },
  {
    fingerprint: "wording.double_full_stop",
    issueFamily: "wording",
    severity: "LOW",
    demoBlocker: false,
    patterns: [/consistent\.\./i, /\.{3,}/],
    expected: "Clean punctuation.",
    suggestedSharedFix: "pilotCleanupVisibleText.",
    likelyFiles: ["lib/criminal/pilot-workflow.ts"],
  },
  {
    fingerprint: "wording.against_extract",
    issueFamily: "wording",
    severity: "MEDIUM",
    demoBlocker: true,
    patterns: [/\bagainst extract\b/i],
    expected: "No '/ against extract' fragments.",
    suggestedSharedFix: "sanitizePilotVisibleLine in pilot-workflow.ts.",
    likelyFiles: ["lib/criminal/pilot-workflow.ts"],
  },
  {
    fingerprint: "wording.battleboard_route_visible",
    issueFamily: "wording",
    severity: "MEDIUM",
    demoBlocker: true,
    patterns: [/\bRoute detail\b/i, /\bBattleboard route\b/i],
    expected: "Pilot hides route detail accordion.",
    suggestedSharedFix: "showPilotRouteDetailPanel() false; hide accordion in CaseControlRoom.",
    likelyFiles: ["lib/criminal/pilot-workflow.ts", "components/criminal/CaseControlRoom.tsx"],
  },
];

export const PROFILE_LEAKAGE_RULES: FingerprintRule[] = [
  {
    fingerprint: "profile_leakage.fraud_cctv",
    issueFamily: "profile_leakage",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [/\bfull cctv\b/i, /\bcctv confirms\b/i],
    expected: "Fraud profile must not foreground CCTV.",
    suggestedSharedFix: "filterWorkflowPilotLines / shouldSuppressWorkflowPilotLine for fraud.",
  },
  {
    fingerprint: "profile_leakage.fraud_cad999",
    issueFamily: "profile_leakage",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [/\b999\b/i, /\bcad\b/i, /CAD\/999 timing supports Crown/i],
    expected: "Fraud profile must not show 999/CAD routes.",
    suggestedSharedFix: "FRAUD_VISIBLE_SUPPRESS in pilot-workflow.ts.",
  },
  {
    fingerprint: "profile_leakage.pwits_cctv",
    issueFamily: "profile_leakage",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [/confirms crown timing/i, /\bfull cctv\b/i],
    expected: "PWITS must not show CCTV timing as main pressure.",
    suggestedSharedFix: "PWITS CCTV suppress in pilot-workflow.ts.",
  },
  {
    fingerprint: "profile_leakage.pwits_mg11",
    issueFamily: "profile_leakage",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [/mg11 is consistent/i, /\bmg11\b.*\bconsistent\b/i],
    expected: "PWITS must not show MG11 is consistent.",
    suggestedSharedFix: "Suppress MG11 consistent lines for pwits profile.",
  },
  {
    fingerprint: "profile_leakage.pwits_dna_fingerprint",
    issueFamily: "profile_leakage",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [/\bDNA\b/i, /\bfingerprint\b/i],
    expected: "PWITS must not foreground DNA/fingerprint without source.",
    suggestedSharedFix: "Filter DNA/fingerprint from PWITS disclosure pack.",
  },
  {
    fingerprint: "profile_leakage.robbery_phone",
    issueFamily: "profile_leakage",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [/\bphone evidence\b/i, /Phone or witness material/i],
    expected: "Robbery uses CCTV/ID/complainant wording, not phone evidence.",
    suggestedSharedFix: "normalizeRobberyPilotVisibleLine / robbery filters.",
  },
  {
    fingerprint: "profile_leakage.robbery_pwits",
    issueFamily: "profile_leakage",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [/intent to supply/i, /Class A controlled drug/i, /phone-attribution pressure/i],
    expected: "Robbery must not show PWITS/drug language.",
    suggestedSharedFix: "Robbery profile pack filters.",
  },
  {
    fingerprint: "profile_leakage.robbery_bank_device",
    issueFamily: "profile_leakage",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [/\bbank export\b/i, /POCA/i, /device\/login audit/i],
    expected: "Robbery must not show bank/device/fraud language.",
    suggestedSharedFix: "Suppress fraud leakage in robbery_identification.",
  },
  {
    fingerprint: "profile_leakage.fraud_robbery",
    issueFamily: "profile_leakage",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [/\brobbery\b/i, /identification \/ participation/i],
    expected: "Fraud must not show robbery/ID route language.",
    suggestedSharedFix: "Fraud profile suppress robbery leakage.",
  },
  {
    fingerprint: "profile_leakage.fraud_pwits_phone",
    issueFamily: "profile_leakage",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [/intent to supply/i, /phone-attribution pressure/i],
    expected: "Fraud must not show PWITS/phone route.",
    suggestedSharedFix: "Fraud profile suppress PWITS leakage.",
  },
  {
    fingerprint: "profile_leakage.pwits_robbery_id",
    issueFamily: "profile_leakage",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [/\brobbery\b/i, /visual\s*id/i],
    expected: "PWITS must not show robbery/visual ID route.",
    suggestedSharedFix: "PWITS profile suppress robbery leakage.",
  },
  {
    fingerprint: "profile_leakage.violence_fraud",
    issueFamily: "profile_leakage",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [/\bbank export\b/i, /account-control/i, /device\/login/i],
    expected: "Violence must not show fraud/bank/device language.",
    suggestedSharedFix: "Violence-family filter (auditor + future workflow profile).",
  },
  {
    fingerprint: "profile_leakage.violence_pwits",
    issueFamily: "profile_leakage",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [/intent to supply/i, /phone extraction/i, /phone-attribution/i],
    expected: "Violence must not show PWITS/phone route.",
    suggestedSharedFix: "Violence-family filter.",
  },
  {
    fingerprint: "profile_leakage.violence_robbery_id",
    issueFamily: "profile_leakage",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [/robbery identification/i, /second-male attribution/i],
    expected: "Violence must not show robbery-ID route unless source-backed.",
    suggestedSharedFix: "Violence-family filter.",
  },
];

export type DiscoveryPattern = {
  pattern: RegExp;
  fingerprint: string;
  issueFamily: string;
  severity: import("./types").AuditorSeverity;
  expected: string;
  suggestedSharedFix: string;
  demoBlocker?: boolean;
};

export const UNIVERSAL_DISCOVERY_PATTERNS: DiscoveryPattern[] = [
  {
    pattern: /\bagainst extract\b/i,
    fingerprint: "wording.against_extract",
    issueFamily: "wording",
    severity: "MEDIUM",
    expected: "No '/ against extract' fragments.",
    suggestedSharedFix: "sanitizePilotVisibleLine / pilotCleanupVisibleText.",
  },
  {
    pattern: /conditional\s*[-–—,]\s*conditional\s+on/i,
    fingerprint: "wording.duplicate_conditional",
    issueFamily: "wording",
    severity: "LOW",
    expected: "Single conditional phrasing.",
    suggestedSharedFix: "pilotRouteStatusBadgeLabel cleanup.",
  },
  {
    pattern: /consistent\.\./i,
    fingerprint: "wording.double_full_stop",
    issueFamily: "wording",
    severity: "LOW",
    expected: "Clean punctuation.",
    suggestedSharedFix: "cleanupPilotVisiblePunctuation.",
  },
  {
    pattern: /\b(CB-TRAP|eval pack|date-control)\b/i,
    fingerprint: "wording.internal_debug_visible",
    issueFamily: "wording",
    severity: "HIGH",
    expected: "No internal/dev/eval case labels in pilot-visible copy.",
    suggestedSharedFix: "filterCourtTodayCasesForPilotUser / isEvalOrStressTestCase.",
    demoBlocker: true,
  },
  {
    pattern: /Interview admission narrows the defence route/i,
    fingerprint: "source.unsupported_interview_admission",
    issueFamily: "source",
    severity: "CRITICAL",
    expected: "No unsupported interview admission.",
    suggestedSharedFix: "sanitizePilotVisibleLine profile-aware replacements.",
    demoBlocker: true,
  },
  {
    pattern: /CAD\/999 timing supports Crown sequence/i,
    fingerprint: "source.overstated_cad999",
    issueFamily: "source",
    severity: "HIGH",
    expected: "Conditional CAD/999 wording.",
    suggestedSharedFix: "softenPilotRiskWording.",
  },
];

export const SOURCE_RULES: FingerprintRule[] = [
  {
    fingerprint: "source.unsupported_interview_admission",
    issueFamily: "source",
    severity: "CRITICAL",
    demoBlocker: true,
    patterns: [/Interview admission narrows the defence route/i],
    expected: "No unsupported interview admission narrowing route.",
    suggestedSharedFix: "sanitizePilotVisibleLine fraud interview replacements.",
  },
  {
    fingerprint: "source.overstated_cad999",
    issueFamily: "source",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [/CAD\/999 timing supports Crown sequence/i, /999\/CAD timing supports Crown sequence/i],
    expected: "CAD/999 conditional — not stated as fact.",
    suggestedSharedFix: "softenPilotRiskWording.",
  },
  {
    fingerprint: "source.overstated_cctv",
    issueFamily: "source",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [/Full CCTV confirms Crown timing/i, /\bconfirms Crown\b/i],
    expected: "CCTV conditional wording only.",
    suggestedSharedFix: "softenPilotRiskWording in pilot-workflow.ts.",
  },
  {
    fingerprint: "source.expert_against_defence",
    issueFamily: "source",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [
      /expert\/source material may return against the defence/i,
      /Missing expert\/source report comes back against defence/i,
    ],
    expected: "Fraud-specific bank/device Crown-support wording.",
    suggestedSharedFix: "sanitizePilotVisibleLine fraud replacements.",
  },
];

export const ANCHOR_RULES: FingerprintRule[] = [
  {
    fingerprint: "anchor.malformed_joined_digits",
    issueFamily: "anchor",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [/\b6MG6 disclosure schedule21/i, /\b5Device login attribution note19/i, /\d{1,3}[A-Za-z]{4,}/],
    expected: "Clean evidence anchors.",
    suggestedSharedFix: "sanitizePilotEvidenceAnchors.",
  },
  {
    fingerprint: "anchor.cutoff_fragment",
    issueFamily: "anchor",
    severity: "HIGH",
    demoBlocker: true,
    patterns: [
      /with a second male.*not included in full/i,
      /stills are described as poor lighting\b/i,
    ],
    expected: "No cut-off CCTV fragments.",
    suggestedSharedFix: "normalizeRobberyPilotVisibleLine.",
  },
];

export const ALL_FINGERPRINT_RULES: FingerprintRule[] = [
  ...UNIVERSAL_WORDING_RULES,
  ...PROFILE_LEAKAGE_RULES,
  ...SOURCE_RULES,
  ...ANCHOR_RULES,
];

/** @deprecated Prefer matchFingerprintRulesForProfile in scorers.ts */
export function matchFingerprintRules(text: string): Array<FingerprintRule & { match: string }> {
  const hits: Array<FingerprintRule & { match: string }> = [];
  for (const rule of ALL_FINGERPRINT_RULES) {
    if (rule.patterns.length === 0) continue;
    for (const re of rule.patterns) {
      const m = text.match(re);
      if (m) {
        hits.push({ ...rule, match: m[0] });
        break;
      }
    }
  }
  return hits;
}

export function severityRank(s: AuditorSeverity): number {
  switch (s) {
    case "CRITICAL":
      return 4;
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    default:
      return 1;
  }
}

export const PROTECTED_FILES_NOTE =
  "Do not touch: DB schema, auth, upload backend/parsing, route engines, Court Today admin runtime, Golden/Battleboard sweeps, eval baselines, Supabase migrations.";
