/**
 * Genuine handler invocation.
 * Only registered handlers with function identity may run.
 * Synthetic invoke map is for fixture tests; production wiring supplies real MAA fns.
 */

import fs from "node:fs";

import { assessApplicability, assertHandlerRegistered, validateHandlerIdentity } from "./handler-gate";
import { deriveExerciseStatus } from "./exercise-status";
import { buildMachineReceipt } from "./machine-receipt";
import { resolveCasePath } from "./shard-manifest";
import { shortHash, templateHash } from "./hashes";
import type {
  ExerciseStatus,
  HandlerInvocationInput,
  MachineReceipt,
  RegisteredHandlerRef,
  ShardCaseRow,
} from "./types";

export type HandlerInvokeFn = (input: {
  caseId: string;
  packet: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  handler: RegisteredHandlerRef;
}) => {
  determinateOutcome: boolean;
  unresolvedOutcome: boolean;
  occurrenceIds: string[];
  exactWordings: string[];
  evidenceRefs: string[];
  plainEnglish: string;
};

export type InvokeRegistry = Map<string, HandlerInvokeFn>;

function loadJson(abs: string | null): Record<string, unknown> | null {
  if (!abs || !fs.existsSync(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, "utf8")) as Record<string, unknown>;
}

/**
 * Invoke one registered handler for one case.
 * Missing inputs → honest not_exercised/unresolved without fabricating findings.
 */
export function invokeRegisteredHandler(input: {
  runId: string;
  repoRoot: string;
  row: ShardCaseRow;
  handlers: RegisteredHandlerRef[];
  controlId: string;
  invokeRegistry: InvokeRegistry;
}): MachineReceipt {
  const handler = assertHandlerRegistered(input.handlers, input.controlId);
  validateHandlerIdentity(handler);

  const packetAbs = resolveCasePath(input.repoRoot, input.row.packetRelativePath);
  const outputAbs = resolveCasePath(input.repoRoot, input.row.outputRelativePath);
  const packet = loadJson(packetAbs);
  const output = loadJson(outputAbs);

  // Present inputs derived from observable artefacts (foundation-level).
  const presentInputs: string[] = [];
  if (packet) presentInputs.push("packet.json");
  if (output) presentInputs.push("casebrain-output.json");
  if (output && typeof output["solicitorVisible"] === "string") {
    presentInputs.push("included_solicitor_visible_wording");
  }
  // Allow packet to declare presentInputs for synthetic fixtures
  const declared = packet?.presentInputs;
  if (Array.isArray(declared)) {
    for (const d of declared) {
      if (typeof d === "string" && !presentInputs.includes(d)) presentInputs.push(d);
    }
  }

  const { applicability, missingInputs } = assessApplicability(handler, presentInputs);

  const invocation: HandlerInvocationInput = {
    caseId: input.row.caseId,
    controlId: handler.controlId,
    handler,
    applicability,
    presentInputs,
    missingInputs,
    outputSha256: input.row.outputSha256,
    surfaceAvailability: { ...input.row.surfaces },
  };

  if (applicability !== "applicable") {
    const exerciseStatus: ExerciseStatus = deriveExerciseStatus({
      applicability,
      handler,
      handlerInvoked: false,
      determinateOutcome: false,
      unresolvedOutcome: false,
    });
    return buildMachineReceipt({
      runId: input.runId,
      phase: "handler_invoke",
      invocation,
      exerciseStatus,
      occurrenceIds: [],
      exactWordings: [],
      templateHashes: [],
      evidenceRefs: presentInputs,
      plainEnglish: `${handler.functionIdentity} not invoked — applicability=${applicability}; missing=${missingInputs.join(",") || "none"}`,
    });
  }

  const fn = input.invokeRegistry.get(handler.functionIdentity);
  if (!fn) {
    // Registered but no invoke binding → honest not_exercised (foundation does not fake execution)
    return buildMachineReceipt({
      runId: input.runId,
      phase: "handler_invoke",
      invocation,
      exerciseStatus: "not_exercised",
      occurrenceIds: [],
      exactWordings: [],
      templateHashes: [],
      evidenceRefs: presentInputs,
      plainEnglish: `${handler.functionIdentity} registered but invoke binding absent in this run — not_exercised`,
    });
  }

  const result = fn({
    caseId: input.row.caseId,
    packet,
    output,
    handler,
  });

  const exerciseStatus = deriveExerciseStatus({
    applicability,
    handler,
    handlerInvoked: true,
    determinateOutcome: result.determinateOutcome,
    unresolvedOutcome: result.unresolvedOutcome,
  });

  const templateHashes = result.exactWordings.map((w) => templateHash(w));
  const occurrenceIds =
    result.occurrenceIds.length > 0
      ? result.occurrenceIds
      : result.exactWordings.map(
          (w, i) => `occ-${shortHash(`${input.row.caseId}|${handler.controlId}|${i}|${w}`)}`,
        );

  return buildMachineReceipt({
    runId: input.runId,
    phase: "handler_invoke",
    invocation,
    exerciseStatus,
    occurrenceIds,
    exactWordings: result.exactWordings,
    templateHashes,
    evidenceRefs: result.evidenceRefs,
    plainEnglish: result.plainEnglish,
  });
}
