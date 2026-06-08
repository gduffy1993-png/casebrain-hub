/** Release thresholds — corpus pass rate is not a perfect-score gate. */

export type CorpusReleaseThresholds = {
  /** Minimum pass rate on discovery split (0–1). Not 100%. */
  discoveryPassRateMin: number;
  /** Maximum fail rate across full corpus (0–1). */
  corpusFailRateMax: number;
  /** Zero tolerance for forbidden strategy phrases in stack output. */
  forbiddenPhrasesAllowed: number;
  /** Gold regression packs must remain fully passing. */
  goldProofMapPass: number;
  goldBattleboardPass: number;
  goldWarRoomPass: number;
  goldBundlePass: number;
  goldExplanationPass: number;
};

export const DEFAULT_CORPUS_RELEASE_THRESHOLDS: CorpusReleaseThresholds = {
  discoveryPassRateMin: 0.85,
  corpusFailRateMax: 0.05,
  forbiddenPhrasesAllowed: 0,
  goldProofMapPass: 7,
  goldBattleboardPass: 7,
  goldWarRoomPass: 7,
  goldBundlePass: 7,
  goldExplanationPass: 7,
};

export type ThresholdEvaluation = {
  thresholds: CorpusReleaseThresholds;
  notes: string[];
  /** Informational — 1000/1000 is not a permanent requirement. */
  perfectScoreRequired: false;
};

export function thresholdBaselineDocument(): string {
  return [
    "# Strategy corpus — release threshold baseline (Phase 4e slice 3)",
    "",
    "**Important:** A 1000/1000 synthetic corpus pass rate means **internal alignment** between the",
    "factory renderer and the evaluators on **fictional** cases. It is **not** a real-world accuracy",
    "or court-outcome guarantee.",
    "",
    "## Required release gates (non-negotiable)",
    "",
    "- **No forbidden phrases** in Proof Map / Battleboard / War Room output (`this wins`, `Crown collapses`,",
    "  `proves innocence`, `guaranteed`, `definitely defeats`, `must dismiss`).",
    "- **Safe War Room wording** — provisional hearing lines; no overconfident concessions.",
    "- **Human review** flagged on serious/provisional offence families where policy requires it.",
    "- **Gold regression 7/7** — proof-map, battleboard-view, war-room-view, bundle fidelity, explanation fidelity.",
    "- **pilot-3 GREEN** and **production-pass** unchanged.",
    "",
    "## Corpus thresholds (threshold-based, not perfect-score)",
    "",
    "| Check | Default threshold |",
    "|-------|-------------------|",
    "| Discovery pass rate | ≥ 85% |",
    "| Full corpus fail rate | ≤ 5% |",
    "| Forbidden phrase violations | 0 |",
    "| Holdout tuning during dev | **Forbidden** |",
    "",
    "## What 1000/1000 does NOT mean",
    "",
    "- Real PDF layout stress (Phase 12 local lane).",
    "- Client matter accuracy or live hearing advice quality.",
    "- Memorisation of gold **7** bundles (gold stays separate regression anchor).",
    "",
    "Fix **shared fingerprints** on discovery/validation; treat holdout as a **milestone report only**.",
    "",
  ].join("\n");
}

export function evaluateThresholdBaseline(
  thresholds: CorpusReleaseThresholds = DEFAULT_CORPUS_RELEASE_THRESHOLDS,
): ThresholdEvaluation {
  return {
    thresholds,
    notes: [
      "Corpus pass target is threshold-based — not 1000/1000 permanent.",
      "Gold 7/7 and pilot/production gates remain the primary ship checks.",
      "Holdout is scored at milestones but must not drive tuning loops.",
    ],
    perfectScoreRequired: false,
  };
}
