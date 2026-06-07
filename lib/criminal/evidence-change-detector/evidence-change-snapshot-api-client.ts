import type { EvidenceChangeSnapshot } from "./evidence-change-types";

export async function postEvidenceChangeSnapshotToApi(
  caseId: string,
  snapshot: EvidenceChangeSnapshot,
): Promise<{ ok: true; snapshot: EvidenceChangeSnapshot } | { ok: false }> {
  try {
    const res = await fetch(
      `/api/criminal/${encodeURIComponent(caseId)}/evidence-change-snapshot`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeLabel: snapshot.routeLabel,
          readinessLevel: snapshot.readinessLevel,
          humanReviewRequired: snapshot.humanReviewRequired,
          missingMaterialLabels: snapshot.missingMaterialLabels,
          contradictionLabels: snapshot.contradictionLabels,
          proofPressureLabels: snapshot.proofPressureLabels,
          disclosureChaseLabels: snapshot.disclosureChaseLabels,
          doNotConcedeLabels: snapshot.doNotConcedeLabels,
          clientInstructionLabels: snapshot.clientInstructionLabels,
          safeNextAction: snapshot.safeNextAction,
          warRoomHearingLine: snapshot.warRoomHearingLine,
          timestamp: snapshot.timestamp,
          sourceState: snapshot.sourceState,
        }),
      },
    );

    if (!res.ok) return { ok: false };

    const json = (await res.json()) as { ok?: boolean; snapshot?: EvidenceChangeSnapshot };
    if (!json.ok || !json.snapshot) return { ok: false };

    return { ok: true, snapshot: json.snapshot };
  } catch {
    return { ok: false };
  }
}

export async function fetchLatestEvidenceChangeSnapshotFromApi(
  caseId: string,
): Promise<EvidenceChangeSnapshot | null> {
  try {
    const res = await fetch(
      `/api/criminal/${encodeURIComponent(caseId)}/evidence-change-snapshot`,
      { cache: "no-store", credentials: "include" },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; latest?: EvidenceChangeSnapshot | null };
    if (!json.ok || !json.latest) return null;
    return json.latest;
  } catch {
    return null;
  }
}
