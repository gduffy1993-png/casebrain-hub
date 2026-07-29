/**
 * Known safety-critical false-negative register.
 * Unknown must remain unknown and block progression — never coerce to zero.
 */

import fs from "node:fs";
import path from "node:path";
import type { SafetyFnKnowledge } from "./types";

export const DEFAULT_KNOWN_FN_REGISTER_PATH = path.join(
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v1",
  "known-fn-register.json",
);

export type KnownFnRegister = {
  schemaVersion: "1.0.0";
  /** When false, knowledgeState=unknown and knownSafetyCriticalFn=null. */
  reviewed: boolean;
  reviewedAt: string | null;
  reviewer: string | null;
  entries: Array<{
    id: string;
    controlId: string;
    status: "open" | "closed" | "accepted_risk";
    safetyCritical: boolean;
    note: string;
    historicalRef: string | null;
  }>;
};

/** Seed register shipped with the auditor — reviewed=false until humans confirm. */
export const SEED_KNOWN_FN_REGISTER: KnownFnRegister = {
  schemaVersion: "1.0.0",
  reviewed: false,
  reviewedAt: null,
  reviewer: null,
  entries: [
    {
      id: "FN-INCOMPLETE-DISCLAIMER",
      controlId: "MAA-COMPLETENESS",
      status: "open",
      safetyCritical: true,
      note:
        "GOLD-11-039 class incomplete disclaimer. Detector contracts exercise complete pass, mid-disclaimer truncation defect, disclaimer absent defect, and non-copyable containment recorded separately. Corpus coverage remains unreviewed — reviewed=false; no human/legal sign-off invented.",
      historicalRef: "GOLD-11-039",
    },
  ],
};

export function loadKnownFnRegister(filePath?: string): KnownFnRegister {
  const p = filePath ?? DEFAULT_KNOWN_FN_REGISTER_PATH;
  if (!fs.existsSync(p)) return SEED_KNOWN_FN_REGISTER;
  return JSON.parse(fs.readFileSync(p, "utf8")) as KnownFnRegister;
}

export function ensureKnownFnRegisterOnDisk(filePath?: string): string {
  const p = filePath ?? DEFAULT_KNOWN_FN_REGISTER_PATH;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify(SEED_KNOWN_FN_REGISTER, null, 2) + "\n");
  }
  return p;
}

export function deriveSafetyFnKnowledge(register: KnownFnRegister, registerPath: string | null): SafetyFnKnowledge {
  if (!register.reviewed || !register.reviewer) {
    return {
      knownSafetyCriticalFn: null,
      knowledgeState: "unknown",
      registerPath,
      entries: register.entries.map((e) => ({
        id: e.id,
        controlId: e.controlId,
        status: e.status,
        note: e.note,
      })),
    };
  }
  const openCritical = register.entries.filter(
    (e) => e.safetyCritical && e.status === "open",
  ).length;
  return {
    knownSafetyCriticalFn: openCritical,
    knowledgeState: "reviewed",
    registerPath,
    entries: register.entries.map((e) => ({
      id: e.id,
      controlId: e.controlId,
      status: e.status,
      note: e.note,
    })),
  };
}
