import type { FixImpactCategory, GroupedFailure } from "./types";

export type FixImpactMeta = {
  fixImpactCategory: FixImpactCategory;
  blastRadius: string;
  likelyFiles: string[];
  regressionTestName: string;
};

const DEFAULT_IMPACT: FixImpactMeta = {
  fixImpactCategory: "global_filter",
  blastRadius: "All pilot workflow surfaces using shared filters.",
  likelyFiles: ["lib/criminal/pilot-workflow.ts"],
  regressionTestName: "pilot_workflow_shared_filter",
};

const IMPACT_BY_PREFIX: Array<{ prefix: string; meta: Partial<FixImpactMeta> }> = [
  {
    prefix: "profile_leakage.",
    meta: {
      fixImpactCategory: "profile_rule",
      blastRadius: "Profile-family workflow copy (Control Room, HWR, Disclosure Chase).",
      regressionTestName: "profile_leakage_family_isolation",
    },
  },
  {
    prefix: "manifest.",
    meta: {
      fixImpactCategory: "truth_manifest",
      blastRadius: "Auditor manifests / catalog certainty only.",
      likelyFiles: ["lib/eval/casebrain-auditor/"],
      regressionTestName: "manifest_certainty_gate",
    },
  },
  {
    prefix: "ui.",
    meta: {
      fixImpactCategory: "ui_permission",
      blastRadius: "Pilot UI visibility and navigation.",
      likelyFiles: ["lib/pilot-mode.ts", "components/criminal/"],
      regressionTestName: "pilot_ui_permission_gate",
    },
  },
  {
    prefix: "court_today.",
    meta: {
      fixImpactCategory: "court_today_date",
      blastRadius: "Court Today diary and pilot date anchor.",
      likelyFiles: ["lib/pilot-mode.ts", "components/criminal/court-today/"],
      regressionTestName: "court_today_pilot_anchor",
    },
  },
  {
    prefix: "source.",
    meta: {
      fixImpactCategory: "source_grounding",
      blastRadius: "Risk/collapse wording and source-conditional phrasing.",
      regressionTestName: "source_grounding_conditional_wording",
    },
  },
  {
    prefix: "strategy.",
    meta: {
      fixImpactCategory: "strategy_ranking",
      blastRadius: "Route titles, next actions, disclosure alignment.",
      regressionTestName: "strategy_route_family_alignment",
    },
  },
  {
    prefix: "anchor.",
    meta: {
      fixImpactCategory: "screen_display",
      blastRadius: "Evidence anchor sanitization in brief builders.",
      regressionTestName: "anchor_sanitization_visible_output",
    },
  },
  {
    prefix: "wording.",
    meta: {
      fixImpactCategory: "screen_display",
      blastRadius: "Visible punctuation and label polish.",
      regressionTestName: "wording_pilot_visible_cleanup",
    },
  },
];

export function fixImpactForFingerprint(fingerprint: string): FixImpactMeta {
  for (const row of IMPACT_BY_PREFIX) {
    if (fingerprint.startsWith(row.prefix)) {
      return { ...DEFAULT_IMPACT, ...row.meta, regressionTestName: row.meta.regressionTestName ?? fingerprint.replace(/\./g, "_") };
    }
  }
  return { ...DEFAULT_IMPACT, regressionTestName: fingerprint.replace(/\./g, "_") };
}

export function enrichGroupedFailure(group: GroupedFailure): GroupedFailure {
  const impact = fixImpactForFingerprint(group.fingerprint);
  return {
    ...group,
    fixImpactCategory: impact.fixImpactCategory,
    blastRadius: impact.blastRadius,
    likelyFiles: impact.likelyFiles ?? DEFAULT_IMPACT.likelyFiles,
    regressionTestName: impact.regressionTestName,
  };
}
