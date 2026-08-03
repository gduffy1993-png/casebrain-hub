/**
 * Handler gate — invoke genuine registered MAA handlers only.
 * Rejects generic “detector ran” claims without identity / contracts.
 */

import {
  lookupPartialHandler,
  PARTIAL_CONTROL_HANDLERS,
} from "@/lib/eval/master-assurance-auditor/v2/every-word/control-handler-registry";
import { STAGE150_PACKET_LOCAL_HANDLERS } from "@/lib/eval/master-assurance-auditor/v2/stage150/detector-registry";
import type { ControlHandlerDef } from "@/lib/eval/master-assurance-auditor/v2/every-word/types";

import type { HandlerApplicability, RegisteredHandlerRef } from "./types";

function toRegistered(h: ControlHandlerDef & { requiredInputs?: string[]; unavailableVerdict?: "not_exercised" | "unresolved" }): RegisteredHandlerRef {
  if (!h.handlerId?.trim()) {
    throw new Error(`handler missing handlerId for ${h.controlId}`);
  }
  if (!h.runtimePath?.trim()) {
    throw new Error(`handler missing functionIdentity/runtimePath for ${h.controlId}`);
  }
  if (!h.positiveContract?.trim() || !h.negativeContract?.trim()) {
    throw new Error(`handler missing contracts for ${h.controlId}`);
  }
  if (!h.inputEligibility?.trim()) {
    throw new Error(`handler missing inputEligibility for ${h.controlId}`);
  }
  return {
    controlId: h.controlId,
    handlerId: h.handlerId,
    functionIdentity: h.runtimePath,
    engineId: h.engineId,
    findingCodes: [...h.findingCodes],
    inputEligibility: h.inputEligibility,
    requiredInputs: h.requiredInputs ? [...h.requiredInputs] : [h.inputEligibility],
    positiveContract: h.positiveContract,
    negativeContract: h.negativeContract,
    receiptValidator: h.receiptValidator,
    unavailableVerdict: h.unavailableVerdict ?? "not_exercised",
  };
}

/** Resolve registered handlers from baseline MAA registries (no V2.1.2 dependency). */
export function resolveBaselineRegisteredHandlers(): RegisteredHandlerRef[] {
  const byControl = new Map<string, RegisteredHandlerRef>();
  for (const h of PARTIAL_CONTROL_HANDLERS) {
    byControl.set(h.controlId, toRegistered(h));
  }
  for (const h of STAGE150_PACKET_LOCAL_HANDLERS) {
    byControl.set(
      h.controlId,
      toRegistered({
        ...h,
        requiredInputs: h.requiredInputs,
        unavailableVerdict: h.unavailableVerdict,
      }),
    );
  }
  return [...byControl.values()];
}

export function assertHandlerRegistered(
  handlers: RegisteredHandlerRef[],
  controlId: string,
): RegisteredHandlerRef {
  const hit = handlers.find((h) => h.controlId === controlId);
  if (!hit) {
    throw new Error(
      `control ${controlId} is not a genuine registered handler — refusing generic exercise claim`,
    );
  }
  validateHandlerIdentity(hit);
  return hit;
}

export function validateHandlerIdentity(handler: RegisteredHandlerRef): void {
  if (!handler.handlerId.trim()) {
    throw new Error("handlerId required");
  }
  if (!handler.functionIdentity.trim()) {
    throw new Error("functionIdentity required");
  }
  if (!handler.positiveContract.trim() || !handler.negativeContract.trim()) {
    throw new Error("positive/negative contracts required");
  }
  if (!handler.inputEligibility.trim()) {
    throw new Error("inputEligibility required");
  }
  // Reject vague placeholder identities
  const vague = /^(detector|handler|ran|executed|check)$/i;
  if (vague.test(handler.handlerId) || vague.test(handler.functionIdentity)) {
    throw new Error(
      `generic handler identity rejected: ${handler.handlerId}/${handler.functionIdentity}`,
    );
  }
}

export function assessApplicability(
  handler: RegisteredHandlerRef,
  presentInputs: string[],
): { applicability: HandlerApplicability; missingInputs: string[] } {
  const present = new Set(presentInputs);
  const missing = handler.requiredInputs.filter((i) => !present.has(i));
  if (missing.length === handler.requiredInputs.length && handler.requiredInputs.length > 0) {
    return { applicability: "unavailable_missing_inputs", missingInputs: missing };
  }
  if (missing.length > 0) {
    return { applicability: "unavailable_missing_inputs", missingInputs: missing };
  }
  return { applicability: "applicable", missingInputs: [] };
}

/** Lookup a single baseline handler by control id (null if unregistered). */
export function lookupBaselineHandler(controlId: string): RegisteredHandlerRef | null {
  const partial = lookupPartialHandler(controlId);
  if (!partial) return null;
  const s150 = STAGE150_PACKET_LOCAL_HANDLERS.find((h) => h.controlId === controlId);
  if (s150) {
    return toRegistered({
      ...s150,
      requiredInputs: s150.requiredInputs,
      unavailableVerdict: s150.unavailableVerdict,
    });
  }
  return toRegistered(partial);
}
