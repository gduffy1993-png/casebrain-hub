/**
 * Ownership / deduplication for calibration candidates — link, do not silently delete.
 */

import crypto from "node:crypto";
import { STAGE150_OWNERSHIP_EDGES } from "../ownership-map";
import type { CalibrationCandidate } from "./blind-runner";

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export function applyOwnershipAndDedupe(candidates: CalibrationCandidate[]): CalibrationCandidate[] {
  // Exact duplicate occurrences (same control + occurrence + wording) → link to first
  const seenExact = new Map<string, string>();
  let rows = candidates.map((c) => {
    const key = `${c.controlId}|${c.occurrenceRef}|${c.wordingHash}`;
    const first = seenExact.get(key);
    if (first && first !== c.candidateId) {
      return {
        ...c,
        duplicateOfCandidateId: first,
        ownershipGroupId: `dup:${first}`,
      };
    }
    if (!first) seenExact.set(key, c.candidateId);
    return c;
  });

  // Ownership edges: consumer findings share group with owner on same case + overlapping surface
  const byCaseControl = new Map<string, CalibrationCandidate[]>();
  for (const c of rows) {
    const k = `${c.caseId}|${c.controlId}`;
    const list = byCaseControl.get(k) ?? [];
    list.push(c);
    byCaseControl.set(k, list);
  }

  for (const edge of STAGE150_OWNERSHIP_EDGES) {
    for (const c of rows) {
      if (c.controlId !== edge.consumerControlId) continue;
      const owners = byCaseControl.get(`${c.caseId}|${edge.ownerControlId}`) ?? [];
      if (!owners.length) continue;
      const owner = owners[0]!;
      const groupId =
        c.ownershipGroupId ??
        `own:${edge.relationship}:${sha256(`${owner.candidateId}|${c.candidateId}`).slice(0, 16)}`;
      c.ownerFindingId = owner.candidateId;
      c.ownershipGroupId = groupId;
      if (!owner.ownershipGroupId) owner.ownershipGroupId = groupId;
    }
  }

  return rows;
}
