import fs from "node:fs";
import path from "node:path";
import type { WarRoomViewCaseResult } from "./war-room-view-types";
import { generateProofMap } from "./proof-map-generate";
import { generateWarRoomView, lintWarRoomViewResult } from "./war-room-view-generate";
import type { ProofMapOffenceLens } from "./proof-map-types";

const REPO_ROOT = path.join(__dirname, "..", "..", "..");
const GOLD_EXPECT_DIR = path.join(REPO_ROOT, "docs", "bundle-fidelity-set", "war-room-view", "gold");

export type WarRoomViewGoldExpect = {
  bundleId: string;
  offenceLens: ProofMapOffenceLens;
  safeHearingLineContains?: string[];
  minCourtRecordRequests?: number;
  minDisclosureTimetableRequests?: number;
  minProsecutionResponsePoints?: number;
  minDoNotConcede?: number;
  minNextHearingActions?: number;
  requiredProofPointIdsReferenced?: string[];
  requiredCourtRecordContains?: string[];
  solicitorReviewRequired?: boolean;
};

export function loadWarRoomViewGoldExpect(bundleId: string): WarRoomViewGoldExpect | null {
  const file = path.join(GOLD_EXPECT_DIR, `${bundleId}.expect.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as WarRoomViewGoldExpect;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function allReferencedProofPointIds(view: Omit<WarRoomViewCaseResult, "overall" | "skipped" | "skipReason" | "scaffoldNote">): Set<string> {
  const ids = new Set<string>();
  for (const c of view.courtRecordRequests) ids.add(c.proofPointId);
  for (const d of view.disclosureTimetableRequests) ids.add(d.proofPointId);
  for (const p of view.prosecutionResponsePoints) ids.add(p.proofPointId);
  for (const a of view.nextHearingActions) ids.add(a.proofPointId);
  return ids;
}

export function evaluateWarRoomViewAgainstExpect(
  view: Omit<WarRoomViewCaseResult, "overall" | "skipped" | "skipReason" | "scaffoldNote">,
  expect: WarRoomViewGoldExpect,
  proofMapProofPointIds: string[],
): string[] {
  const failures: string[] = [];
  failures.push(...lintWarRoomViewResult(view));

  if (view.offenceLens !== expect.offenceLens) {
    failures.push(`offenceLens ${view.offenceLens} !== expected ${expect.offenceLens}`);
  }

  for (const phrase of expect.safeHearingLineContains ?? ["provisional", "papers"]) {
    if (!norm(view.safeHearingLine).includes(norm(phrase))) {
      failures.push(`safeHearingLine missing: ${phrase}`);
    }
  }

  if ((expect.minCourtRecordRequests ?? 1) > view.courtRecordRequests.length) {
    failures.push(
      `courtRecordRequests ${view.courtRecordRequests.length} < min ${expect.minCourtRecordRequests ?? 1}`,
    );
  }

  if ((expect.minDisclosureTimetableRequests ?? 1) > view.disclosureTimetableRequests.length) {
    failures.push(
      `disclosureTimetableRequests ${view.disclosureTimetableRequests.length} < min ${expect.minDisclosureTimetableRequests ?? 1}`,
    );
  }

  if ((expect.minProsecutionResponsePoints ?? 0) > view.prosecutionResponsePoints.length) {
    failures.push(
      `prosecutionResponsePoints ${view.prosecutionResponsePoints.length} < min ${expect.minProsecutionResponsePoints}`,
    );
  }

  if ((expect.minDoNotConcede ?? 1) > view.doNotConcede.length) {
    failures.push(`doNotConcede ${view.doNotConcede.length} < min ${expect.minDoNotConcede ?? 1}`);
  }

  if ((expect.minNextHearingActions ?? 1) > view.nextHearingActions.length) {
    failures.push(
      `nextHearingActions ${view.nextHearingActions.length} < min ${expect.minNextHearingActions ?? 1}`,
    );
  }

  const referenced = allReferencedProofPointIds(view);
  for (const id of expect.requiredProofPointIdsReferenced ?? ["pp-disclosure-fair-trial"]) {
    if (!referenced.has(id)) failures.push(`no war room item references proofPointId: ${id}`);
  }

  for (const needle of expect.requiredCourtRecordContains ?? []) {
    const hit = view.courtRecordRequests.some((c) => norm(c.request).includes(norm(needle)));
    if (!hit) failures.push(`no courtRecordRequest containing: ${needle}`);
  }

  if (expect.solicitorReviewRequired !== undefined && view.solicitorReviewRequired !== expect.solicitorReviewRequired) {
    failures.push(
      `solicitorReviewRequired ${view.solicitorReviewRequired} !== ${expect.solicitorReviewRequired}`,
    );
  }

  for (const id of referenced) {
    if (!proofMapProofPointIds.includes(id)) {
      failures.push(`orphan proofPointId on war room item: ${id}`);
    }
  }

  return [...new Set(failures)];
}

export function evaluateWarRoomViewCase(
  bundleId: string,
  label: string,
  bundleText: string,
): {
  view: ReturnType<typeof generateWarRoomView>;
  expect: WarRoomViewGoldExpect | null;
  failures: string[];
} {
  const map = generateProofMap(bundleId, label, bundleText);
  const view = generateWarRoomView(map);
  const expect = loadWarRoomViewGoldExpect(bundleId);
  if (!expect) {
    return { view, expect: null, failures: ["no gold war-room-view expect file"] };
  }
  return {
    view,
    expect,
    failures: evaluateWarRoomViewAgainstExpect(view, expect, map.proofPoints.map((p) => p.id)),
  };
}
