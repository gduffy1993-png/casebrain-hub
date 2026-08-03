/**
 * Interrupt / resume checkpoint store — no duplicate accepted cases on resume.
 */

import fs from "node:fs";
import path from "node:path";

import { sha256CanonicalJson } from "./hash";
import type { ControllerState } from "./types";

export const STATE_FILENAME = "controller-state.json";
export const RESUME_TOKEN_FILENAME = "resume-token.txt";

export function stateDir(controlRoot: string): string {
  return path.join(controlRoot, "state");
}

export function writeControllerState(
  controlRoot: string,
  state: ControllerState,
): { statePath: string; resumeToken: string } {
  const dir = stateDir(controlRoot);
  fs.mkdirSync(dir, { recursive: true });
  const resumeToken = sha256CanonicalJson({
    populationId: state.populationId,
    membershipSha256: state.membership.membershipSha256,
    acceptedCount: state.membership.acceptedCount,
    rejectionCount: state.rejections.length,
  });
  const next: ControllerState = { ...state, lastResumeToken: resumeToken };
  const statePath = path.join(dir, STATE_FILENAME);
  // Atomic-ish write: temp then rename.
  const tmp = `${statePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), "utf8");
  fs.renameSync(tmp, statePath);
  fs.writeFileSync(path.join(dir, RESUME_TOKEN_FILENAME), resumeToken, "utf8");
  return { statePath, resumeToken };
}

export function loadControllerState(controlRoot: string): ControllerState {
  const statePath = path.join(stateDir(controlRoot), STATE_FILENAME);
  if (!fs.existsSync(statePath)) {
    throw new Error(`no controller state at ${statePath}`);
  }
  const raw = JSON.parse(fs.readFileSync(statePath, "utf8")) as ControllerState;
  return raw;
}

export function tryLoadControllerState(
  controlRoot: string,
): ControllerState | null {
  const statePath = path.join(stateDir(controlRoot), STATE_FILENAME);
  if (!fs.existsSync(statePath)) return null;
  return loadControllerState(controlRoot);
}

/** Already-accepted caseIds — resume must skip these to avoid duplicates. */
export function acceptedCaseIdSet(state: ControllerState): Set<string> {
  return new Set(state.membership.accepted.map((e) => e.caseId));
}

export function shouldSkipSlotOnResume(
  state: ControllerState,
  globalSlot: number,
): boolean {
  return state.membership.accepted.some(
    (e) => e.globalSlot === globalSlot && e.globalSlot >= 0,
  );
}
