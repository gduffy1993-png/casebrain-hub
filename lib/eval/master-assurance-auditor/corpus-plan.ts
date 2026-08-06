/**
 * Versioned corpus plan / adapter for calibration stages.
 * A stage is refused when the selected corpus cannot supply enough UNIQUE cases.
 * Never silently Math.min down to a smaller corpus.
 */

import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_GOLD_CORPUS_ROOT,
  loadGoldCasePacket,
  listGoldCaseDirs,
} from "./case-loader";
import {
  DEFAULT_ESA_CORPUS_ROOT,
  ESA_ADAPTER_ID,
  loadEsaCasePacket,
  validateEsaAdapter,
} from "./esa-adapter";
import {
  DEFAULT_STAGE50_FREEZE_DIR,
  type Stage50SampleFreeze,
} from "./esa-stage50-sample-freeze";
import type {
  CalibrationStage,
  CorpusMembershipEntry,
  CorpusResolution,
  SavedCaseMaterialisation,
} from "./types";

export const CORPUS_PLAN_VERSION = "corpus-plan-v1" as const;

export type CorpusAdapterId =
  | "gold-manual-proof-set-v1"
  | "phase11-gold-freeze-v1"
  | "esa-local-materialised"
  | "messy-pdf-proof-v9-scale3000";

export type StageCorpusPlan = {
  stage: CalibrationStage;
  requiredUniqueCases: number;
  adapterId: CorpusAdapterId;
  corpusRoot: string;
  note: string;
};

/** Explicit plan — larger stages declare adapters that must actually exist at run time. */
export const STAGE_CORPUS_PLAN: Record<Exclude<CalibrationStage, "contracts">, StageCorpusPlan> = {
  "20": {
    stage: "20",
    requiredUniqueCases: 20,
    adapterId: "gold-manual-proof-set-v1",
    corpusRoot: DEFAULT_GOLD_CORPUS_ROOT,
    note: "Preserved gold-manual CASE-01..20 packets",
  },
  "50": {
    stage: "50",
    requiredUniqueCases: 50,
    adapterId: ESA_ADAPTER_ID,
    corpusRoot: DEFAULT_ESA_CORPUS_ROOT,
    note: "ESA local materialised cases (bundle-text + casebrain-output + truth-key); bound via esa-adapter; do not run until Codex clears stage 20",
  },
  "150": {
    stage: "150",
    requiredUniqueCases: 150,
    adapterId: ESA_ADAPTER_ID,
    corpusRoot: DEFAULT_ESA_CORPUS_ROOT,
    note: "Requires ≥150 unique ESA materialised cases",
  },
  "300": {
    stage: "300",
    requiredUniqueCases: 300,
    adapterId: ESA_ADAPTER_ID,
    corpusRoot: DEFAULT_ESA_CORPUS_ROOT,
    note: "Requires ≥300 unique ESA materialised cases",
  },
  "3000": {
    stage: "3000",
    requiredUniqueCases: 3000,
    adapterId: "messy-pdf-proof-v9-scale3000",
    corpusRoot: path.join(
      "artifacts",
      "casebrain-qa",
      "messy-pdf-proof-v9-scale3000",
    ),
    note: "Requires scale3000 identity membership + materialised surfaces",
  },
};

export function getStageCorpusPlan(stage: CalibrationStage): StageCorpusPlan | null {
  if (stage === "contracts") return null;
  return STAGE_CORPUS_PLAN[stage];
}

function dedupeMembership(entries: CorpusMembershipEntry[]): {
  unique: CorpusMembershipEntry[];
  duplicatesDropped: number;
} {
  const seen = new Set<string>();
  const unique: CorpusMembershipEntry[] = [];
  let duplicatesDropped = 0;
  for (const e of entries) {
    const key = e.caseId.toLowerCase();
    if (seen.has(key)) {
      duplicatesDropped += 1;
      continue;
    }
    seen.add(key);
    unique.push(e);
  }
  return { unique, duplicatesDropped };
}

function loadGoldMembership(corpusRoot: string, limit: number): {
  cases: SavedCaseMaterialisation[];
  membership: CorpusMembershipEntry[];
} {
  const dirs = listGoldCaseDirs(corpusRoot).slice(0, limit);
  const cases = dirs.map(loadGoldCasePacket);
  const membership: CorpusMembershipEntry[] = cases.map((c) => ({
    caseId: c.caseId,
    sourceCaseId: c.sourceCaseId,
    adapterId: "gold-manual-proof-set-v1",
    packetPath: c.packetPath.replace(/\\/g, "/"),
  }));
  return { cases, membership };
}

/**
 * Resolve corpus for a stage. Refuses when unique membership < requiredUniqueCases.
 * Stage 20 uses gold-manual packets.
 * Stage 50+ ESA adapter is bound via validateEsaAdapter (materialisation only —
 * callers must not execute controls unless explicitly running the stage).
 */
export function resolveCorpusForStage(input: {
  stage: CalibrationStage;
  corpusRootOverride?: string;
}): {
  resolution: CorpusResolution;
  cases: SavedCaseMaterialisation[];
} {
  if (input.stage === "contracts") {
    return {
      cases: [],
      resolution: {
        planVersion: CORPUS_PLAN_VERSION,
        stage: "contracts",
        adapterId: "gold-manual-proof-set-v1",
        requiredUniqueCases: 0,
        uniqueCaseCount: 0,
        membership: [],
        refused: false,
        refuseReason: null,
        denominators: { uniqueCases: 0, duplicateCaseIdsDropped: 0, surfaces: 0 },
      },
    };
  }

  const plan = getStageCorpusPlan(input.stage)!;
  const root = input.corpusRootOverride ?? plan.corpusRoot;

  if (plan.adapterId === "gold-manual-proof-set-v1") {
    const loaded = loadGoldMembership(root, plan.requiredUniqueCases + 5);
    const { unique, duplicatesDropped } = dedupeMembership(loaded.membership);
    const uniqueCases = loaded.cases.filter((c) =>
      unique.some((m) => m.caseId === c.caseId),
    );
    const trimmedMembership = unique.slice(0, plan.requiredUniqueCases);
    const trimmedCases = uniqueCases
      .filter((c) => trimmedMembership.some((m) => m.caseId === c.caseId))
      .slice(0, plan.requiredUniqueCases);
    const uniqueCount = trimmedMembership.length;
    const refused = uniqueCount < plan.requiredUniqueCases;
    return {
      cases: refused ? trimmedCases : trimmedCases,
      resolution: {
        planVersion: CORPUS_PLAN_VERSION,
        stage: input.stage,
        adapterId: plan.adapterId,
        requiredUniqueCases: plan.requiredUniqueCases,
        uniqueCaseCount: uniqueCount,
        membership: trimmedMembership,
        refused,
        refuseReason: refused
          ? `Corpus adapter ${plan.adapterId} has ${uniqueCount} unique cases; stage ${input.stage} requires ${plan.requiredUniqueCases}`
          : null,
        denominators: {
          uniqueCases: uniqueCount,
          duplicateCaseIdsDropped: duplicatesDropped,
          surfaces: trimmedCases.reduce((n, c) => n + c.surfaces.length, 0),
        },
      },
    };
  }

  // ESA Stage-50+ adapter — bind materialisations; do not invent gold packets.
  // Stage 50 prefers a frozen stratified sample when present (membership before findings).
  if (plan.adapterId === ESA_ADAPTER_ID) {
    const freezePath = path.join(DEFAULT_STAGE50_FREEZE_DIR, "STAGE-50-SAMPLE-FREEZE.json");
    if (
      input.stage === "50" &&
      !input.corpusRootOverride &&
      fs.existsSync(freezePath)
    ) {
      const freeze = JSON.parse(
        fs.readFileSync(freezePath, "utf8"),
      ) as Stage50SampleFreeze;
      const cases: SavedCaseMaterialisation[] = [];
      const membership: CorpusMembershipEntry[] = [];
      for (const row of freeze.membership) {
        const loaded = loadEsaCasePacket(row.packetPath);
        if (!loaded.ok) {
          return {
            cases: [],
            resolution: {
              planVersion: CORPUS_PLAN_VERSION,
              stage: input.stage,
              adapterId: ESA_ADAPTER_ID,
              requiredUniqueCases: plan.requiredUniqueCases,
              uniqueCaseCount: 0,
              membership: [],
              refused: true,
              refuseReason: `Frozen Stage-50 membership case "${row.caseId}" failed to load: ${loaded.reason}`,
              denominators: {
                uniqueCases: 0,
                duplicateCaseIdsDropped: 0,
                surfaces: 0,
              },
            },
          };
        }
        cases.push(loaded.materialisation);
        membership.push({
          caseId: row.caseId,
          sourceCaseId: null,
          adapterId: ESA_ADAPTER_ID,
          packetPath: row.packetPath,
        });
      }
      const refused = membership.length < plan.requiredUniqueCases;
      return {
        cases: refused ? [] : cases,
        resolution: {
          planVersion: CORPUS_PLAN_VERSION,
          stage: input.stage,
          adapterId: ESA_ADAPTER_ID,
          requiredUniqueCases: plan.requiredUniqueCases,
          uniqueCaseCount: membership.length,
          membership,
          refused,
          refuseReason: refused
            ? `Frozen Stage-50 sample has ${membership.length} cases; requires ${plan.requiredUniqueCases}`
            : null,
          denominators: {
            uniqueCases: membership.length,
            duplicateCaseIdsDropped: 0,
            surfaces: cases.reduce((n, c) => n + c.surfaces.length, 0),
          },
        },
      };
    }

    const { report, cases } = validateEsaAdapter({
      corpusRoot: root,
      requiredUniqueCases: plan.requiredUniqueCases,
    });
    // Without a freeze file, refuse silent slice(0,N) for stage 50 — require freeze.
    if (input.stage === "50" && !input.corpusRootOverride) {
      return {
        cases: [],
        resolution: {
          planVersion: CORPUS_PLAN_VERSION,
          stage: input.stage,
          adapterId: ESA_ADAPTER_ID,
          requiredUniqueCases: plan.requiredUniqueCases,
          uniqueCaseCount: report.uniqueValidCaseCount,
          membership: report.membership.map((m) => ({
            caseId: m.caseId,
            sourceCaseId: null,
            adapterId: ESA_ADAPTER_ID,
            packetPath: m.packetPath,
          })),
          refused: true,
          refuseReason: `Stage 50 requires a stratified freeze at ${freezePath.replace(/\\/g, "/")} (population ${report.uniqueValidCaseCount} valid). Do not use accepted.slice(0, 50).`,
          denominators: {
            uniqueCases: report.uniqueValidCaseCount,
            duplicateCaseIdsDropped: report.totals.duplicateCount,
            surfaces: report.totals.surfaceCount,
          },
        },
      };
    }
    const membership: CorpusMembershipEntry[] = report.membership
      .slice(0, plan.requiredUniqueCases)
      .map((m) => ({
        caseId: m.caseId,
        sourceCaseId: null,
        adapterId: ESA_ADAPTER_ID,
        packetPath: m.packetPath,
      }));
    return {
      cases: report.sufficientForStage50 ? cases : [],
      resolution: {
        planVersion: CORPUS_PLAN_VERSION,
        stage: input.stage,
        adapterId: ESA_ADAPTER_ID,
        requiredUniqueCases: plan.requiredUniqueCases,
        uniqueCaseCount: report.uniqueValidCaseCount,
        membership: report.sufficientForStage50
          ? membership
          : report.membership.map((m) => ({
              caseId: m.caseId,
              sourceCaseId: null,
              adapterId: ESA_ADAPTER_ID,
              packetPath: m.packetPath,
            })),
        refused: !report.sufficientForStage50,
        refuseReason: report.refuseReason,
        denominators: {
          uniqueCases: report.uniqueValidCaseCount,
          duplicateCaseIdsDropped: report.totals.duplicateCount,
          surfaces: report.totals.surfaceCount,
        },
      },
    };
  }

  // Declared larger-stage adapters without ESA binding: refuse unless override is gold.
  if (input.corpusRootOverride && fs.existsSync(input.corpusRootOverride)) {
    const goldDirs = listGoldCaseDirs(input.corpusRootOverride);
    if (goldDirs.length) {
      const loaded = loadGoldMembership(input.corpusRootOverride, goldDirs.length);
      const { unique, duplicatesDropped } = dedupeMembership(loaded.membership);
      const uniqueCount = unique.length;
      const refused = uniqueCount < plan.requiredUniqueCases;
      return {
        cases: refused ? [] : loaded.cases.slice(0, plan.requiredUniqueCases),
        resolution: {
          planVersion: CORPUS_PLAN_VERSION,
          stage: input.stage,
          adapterId: plan.adapterId,
          requiredUniqueCases: plan.requiredUniqueCases,
          uniqueCaseCount: uniqueCount,
          membership: unique,
          refused,
          refuseReason: refused
            ? `Override corpus has ${uniqueCount} unique cases; stage ${input.stage} requires ${plan.requiredUniqueCases} (adapter ${plan.adapterId})`
            : null,
          denominators: {
            uniqueCases: uniqueCount,
            duplicateCaseIdsDropped: duplicatesDropped,
            surfaces: 0,
          },
        },
      };
    }
  }

  let availableHint = 0;
  if (fs.existsSync(root)) {
    try {
      availableHint = fs.readdirSync(root).length;
    } catch {
      availableHint = 0;
    }
  }
  return {
    cases: [],
    resolution: {
      planVersion: CORPUS_PLAN_VERSION,
      stage: input.stage,
      adapterId: plan.adapterId,
      requiredUniqueCases: plan.requiredUniqueCases,
      uniqueCaseCount: 0,
      membership: [],
      refused: true,
      refuseReason: `Stage ${input.stage} adapter ${plan.adapterId} is not yet binding auditor-ready packets (${availableHint} root entries visible). Required unique cases: ${plan.requiredUniqueCases}. Do not substitute the 20-case gold corpus.`,
      denominators: {
        uniqueCases: 0,
        duplicateCaseIdsDropped: 0,
        surfaces: 0,
      },
    },
  };
}

export function assertCorpusSufficient(resolution: CorpusResolution): void {
  if (resolution.refused) {
    throw new Error(resolution.refuseReason ?? "Corpus insufficient for stage");
  }
}
