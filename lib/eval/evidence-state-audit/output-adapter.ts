import {
  labelMatchScore,
  mapExistenceToPredicted,
  parseEvidenceStateFromChaseCopy,
} from "./normalize";
import type { AdaptedPrediction, CaseBrainAuditOutput } from "./types";

const MATCH_THRESHOLD = 0.45;

function collectPredictions(output: CaseBrainAuditOutput): AdaptedPrediction[] {
  const byLabel = new Map<string, AdaptedPrediction>();

  const upsert = (label: string, patch: Partial<AdaptedPrediction>) => {
    const key = label.trim();
    if (!key) return;
    const existing = byLabel.get(key) ?? { label: key, predictedState: "unknown" as const };
    byLabel.set(key, {
      ...existing,
      ...patch,
      label: key,
      predictedState: patch.predictedState ?? existing.predictedState,
    });
  };

  for (const row of output.fiveAnswersEvidenceRows ?? []) {
    upsert(row.label, {
      existence: row.existence ?? null,
      reliability: row.reliability ?? null,
      predictedState: mapExistenceToPredicted(row.existence),
    });
  }

  for (const row of output.evidenceStates ?? []) {
    upsert(row.label, {
      inferredSourceState: row.inferredSourceState ?? null,
      sendability: row.sendability ?? null,
      source: row.source ?? null,
      predictedState: mapExistenceToPredicted(row.existenceLabel, row.inferredSourceState),
    });
  }

  for (const chase of output.warningsAndGaps?.chaseItems ?? []) {
    const fromCopy = parseEvidenceStateFromChaseCopy(chase.copySuggestion);
    upsert(chase.label, {
      ...(fromCopy ? { predictedState: fromCopy } : {}),
      sendability: chase.sendabilityLabel ?? null,
    });
  }

  return [...byLabel.values()];
}

export function adaptCaseBrainOutput(raw: unknown): CaseBrainAuditOutput {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const output = obj as CaseBrainAuditOutput;
  const textParts: string[] = [];

  for (const line of output.warningsAndGaps?.doNotOverstate ?? []) textParts.push(line);
  for (const line of output.warningsAndGaps?.hardRules ?? []) textParts.push(line);
  for (const chase of output.warningsAndGaps?.chaseItems ?? []) {
    if (chase.copySuggestion) textParts.push(chase.copySuggestion);
  }
  if (output.courtNote?.text) textParts.push(output.courtNote.text);

  output.outputTextBlob = textParts.join("\n");
  return output;
}

export function findBestPrediction(
  truthLabel: string,
  predictions: AdaptedPrediction[],
): { prediction: AdaptedPrediction | null; score: number } {
  let best: AdaptedPrediction | null = null;
  let bestScore = 0;
  for (const p of predictions) {
    const score = labelMatchScore(truthLabel, p.label);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  if (bestScore < MATCH_THRESHOLD) return { prediction: null, score: bestScore };
  return { prediction: best, score: bestScore };
}

export function listPredictions(output: CaseBrainAuditOutput): AdaptedPrediction[] {
  return collectPredictions(adaptCaseBrainOutput(output));
}
