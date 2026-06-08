/** Source-grounding rubric — deterministic pattern checks in scorers.ts. No external APIs. */

export type SourceGroundingRule = {
  id: string;
  label: string;
  patterns: RegExp[];
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  expected: string;
  fingerprint: string;
};

export const SOURCE_GROUNDING_RULES: SourceGroundingRule[] = [
  {
    id: "unsupported_admission",
    label: "No admission unless interview supports it",
    patterns: [/Interview admission narrows/i],
    severity: "CRITICAL",
    expected: "No interview admissions without served interview material.",
    fingerprint: "source.unsupported_interview_admission",
  },
  {
    id: "overstated_cad999",
    label: "No CAD/999 certainty when partial",
    patterns: [/CAD\/999 timing supports Crown sequence/i, /999\/CAD timing supports Crown sequence/i],
    severity: "HIGH",
    expected: "Conditional CAD/999 wording.",
    fingerprint: "source.overstated_cad999",
  },
  {
    id: "overstated_cctv",
    label: "No CCTV certainty when partial",
    patterns: [/Full CCTV confirms Crown timing/i],
    severity: "HIGH",
    expected: "Conditional CCTV wording.",
    fingerprint: "source.overstated_cctv",
  },
  {
    id: "expert_against_defence",
    label: "No generic expert/source against defence",
    patterns: [
      /expert\/source material may return against the defence/i,
      /Missing expert\/source report comes back against defence/i,
    ],
    severity: "HIGH",
    expected: "Profile-appropriate Crown-risk wording.",
    fingerprint: "source.expert_against_defence",
  },
];

export function runSourceGroundingPatternScan(
  text: string,
): Array<SourceGroundingRule & { match: string }> {
  const hits: Array<SourceGroundingRule & { match: string }> = [];
  for (const rule of SOURCE_GROUNDING_RULES) {
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
