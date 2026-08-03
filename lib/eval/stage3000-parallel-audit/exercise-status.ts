/**
 * Honest exercise status accounting.
 * evaluated | unresolved | not_exercised — never invent pass from silence.
 */

import type {
  ExerciseStatus,
  HandlerApplicability,
  RegisteredHandlerRef,
} from "./types";

export function deriveExerciseStatus(input: {
  applicability: HandlerApplicability;
  handler: RegisteredHandlerRef;
  /** True when the handler function actually executed against eligible inputs. */
  handlerInvoked: boolean;
  /** True when invocation produced a determinate finding or clean negative. */
  determinateOutcome: boolean;
  /** True when outcome requires further evidence / human / unresolved path. */
  unresolvedOutcome: boolean;
}): ExerciseStatus {
  if (input.applicability === "unavailable_missing_inputs") {
    return input.handler.unavailableVerdict;
  }
  if (input.applicability === "not_applicable") {
    return "not_exercised";
  }
  if (!input.handlerInvoked) {
    return "not_exercised";
  }
  if (input.unresolvedOutcome) return "unresolved";
  if (input.determinateOutcome) return "evaluated";
  return "unresolved";
}
