/**
 * Real-PDF Live Pilot v1 — priority control map.
 *
 * Loads the existing 361-control registry (auditor-control-registry-v2.json) and
 * tags every control with whether it belongs to a solicitor-critical "priority family"
 * for this pilot, alongside its already-recorded implementationStatus/currentlyRunnable
 * from the registry itself (this script does not re-derive or override those fields —
 * they come straight from the registry, which is the honest source of truth).
 *
 *   node --import tsx scripts/assurance/real-pdf-live-pilot/priority-control-map.ts
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { ARTEFACT_ROOT } from "./pilot-20-definition";

const REPO_ROOT = process.cwd();
const REGISTRY_PATH = path.join(
  REPO_ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/auditor-control-registry-v2.json",
);
const ARTEFACTS_DIR = path.join(REPO_ROOT, ARTEFACT_ROOT);

/**
 * Registry families judged solicitor-critical for a real-PDF live pilot: charge
 * integrity, wording quality, evidence-state reliability, chase actionability,
 * audience separation, cross-exit warning consistency, attribution, bundle
 * completeness, exact source fidelity, chronology, legal-state language, and the
 * 24 preserved V1 master lanes (the only lanes with any implemented detector today).
 */
const PRIORITY_FAMILIES = new Set<string>([
  "V1. Preserved Master Lanes",
  "E. Charge and Provision Integrity",
  "L. Professional Wording Quality",
  "F. Evidence State and Reliability",
  "K. Chase Quality and Actionability",
  "M. Audience Separation",
  "N. Warning Attachment and All-Exit Consistency",
  "G. Attribution and Multi-Defendant Control",
  "B. Bundle Completeness and Document Relationships",
  "C. Exact Source Fidelity",
  "H. Chronology, Numbers and Deadlines",
  "D. Legal-State Language",
]);

type RegistryControl = {
  controlId: string;
  family: string;
  familyCode: string;
  subfamily: string;
  laneId?: string;
  implementationStatus: string;
  currentlyRunnable: boolean;
  unavailableReason: string | null;
  detectorEntrypoint: string | null;
  version: string;
};

type RegistryFile = {
  registryVersion: string;
  baselineCommit: string;
  controls: RegistryControl[];
};

export type PriorityControlMapEntry = {
  controlId: string;
  family: string;
  familyCode: string;
  subfamily: string;
  implementationStatus: string;
  currentlyRunnable: boolean;
  priorityFamily: string | null;
  exercisePlan: string;
};

function exercisePlanFor(c: RegistryControl, isPriority: boolean): string {
  if (c.implementationStatus === "implemented" && c.currentlyRunnable) {
    return `RUNNABLE: exercise via ${c.detectorEntrypoint ?? "registry detectorEntrypoint"} against this pilot's 20 real-PDF materialised packets.`;
  }
  const reason = c.unavailableReason ?? c.implementationStatus;
  if (!isPriority) {
    return `NOT_EXERCISED (non-priority for this pilot): ${reason}`;
  }
  return `NOT_EXERCISED: ${reason}`;
}

export function loadControlRegistry(): RegistryFile {
  const raw = fs.readFileSync(REGISTRY_PATH, "utf8");
  return JSON.parse(raw) as RegistryFile;
}

export function buildPriorityControlMap(): {
  entries: PriorityControlMapEntry[];
  summary: Record<string, unknown>;
} {
  const registry = loadControlRegistry();
  const entries: PriorityControlMapEntry[] = registry.controls.map((c) => {
    const isPriority = PRIORITY_FAMILIES.has(c.family);
    return {
      controlId: c.controlId,
      family: c.family,
      familyCode: c.familyCode,
      subfamily: c.subfamily,
      implementationStatus: c.implementationStatus,
      currentlyRunnable: c.currentlyRunnable,
      priorityFamily: isPriority ? c.family : null,
      exercisePlan: exercisePlanFor(c, isPriority),
    };
  });

  const priorityEntries = entries.filter((e) => e.priorityFamily !== null);
  const runnableCount = entries.filter((e) => e.exercisePlan.startsWith("RUNNABLE")).length;
  const priorityRunnableCount = priorityEntries.filter((e) => e.exercisePlan.startsWith("RUNNABLE")).length;

  const summary = {
    schemaVersion: "real-pdf-live-pilot-priority-control-map@1.0.0",
    registryVersion: registry.registryVersion,
    registryBaselineCommit: registry.baselineCommit,
    totalControls: entries.length,
    priorityFamilyControls: priorityEntries.length,
    priorityFamilies: Array.from(PRIORITY_FAMILIES),
    runnableTotal: runnableCount,
    runnablePriority: priorityRunnableCount,
    notExercisedTotal: entries.length - runnableCount,
    honestyNote:
      "implementationStatus/currentlyRunnable/detectorEntrypoint are read verbatim from the registry, " +
      "not re-derived. Only registry-confirmed implemented+currentlyRunnable controls are ever exercised.",
  };

  return { entries, summary };
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function main(): void {
  const { entries, summary } = buildPriorityControlMap();
  writeJson(path.join(ARTEFACTS_DIR, "priority-control-map-361.json"), {
    ...summary,
    controls: entries,
  });
  console.log(JSON.stringify(summary, null, 2));
}

const isMainModule = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMainModule) main();
