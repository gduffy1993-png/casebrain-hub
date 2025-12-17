import type { PracticeArea, KeyFactsKeyDate } from "@/lib/types/casebrain";
import type { LayeredSummary, LayeredSummaryBuildInput } from "./types";
import { buildDomainSummaries } from "./domain-engine";
import { buildRoleLenses } from "./role-lenses";
import { stableHash } from "./util";
import type { LayeredSummaryCache } from "./cache";
import { noopLayeredSummaryCache } from "./cache";

function buildKeyFactsHash(input: {
  documentIds: string[];
  totalPages?: number;
  latestAnalysisVersion?: number | null;
  keyDates: KeyFactsKeyDate[];
  mainRisks: string[];
}): string {
  const payload = JSON.stringify({
    docIds: input.documentIds.slice().sort(),
    totalPages: input.totalPages ?? null,
    latestAnalysisVersion: input.latestAnalysisVersion ?? null,
    keyDates: input.keyDates.map((d) => ({ label: d.label, date: d.date })),
    mainRisks: input.mainRisks,
  });
  return stableHash(payload);
}

export function buildLayeredSummary(input: LayeredSummaryBuildInput): LayeredSummary {
  const docIds = input.documents.map((d) => d.id);
  const keyFactsHash = buildKeyFactsHash({
    documentIds: docIds,
    totalPages: input.totalPages,
    latestAnalysisVersion: input.latestAnalysisVersion,
    keyDates: input.keyDates,
    mainRisks: input.mainRisks,
  });

  const isLargeBundleMode = (input.totalPages ?? 0) > 300;

  const domainSummaries = buildDomainSummaries({
    practiceArea: input.practiceArea,
    documents: input.documents,
    keyDates: input.keyDates,
    versionMissingEvidence: input.versionMissingEvidence,
  });

  const roleLenses = buildRoleLenses({
    domains: domainSummaries,
    context: {
      practiceArea: input.practiceArea,
      isLargeBundleMode,
      keyDates: input.keyDates,
      mainRisks: input.mainRisks,
    },
  });

  const layered: LayeredSummary = {
    version: 1,
    computedAt: new Date().toISOString(),
    practiceArea: input.practiceArea,
    source: {
      documentIds: docIds,
      totalPages: input.totalPages,
      latestAnalysisVersion: input.latestAnalysisVersion ?? null,
      keyFactsHash,
    },
    isLargeBundleMode,
    domainSummaries,
    roleLenses,
  };

  return layered;
}

export async function getOrBuildLayeredSummary(
  input: LayeredSummaryBuildInput & { caseId: string; orgId: string; cache?: LayeredSummaryCache }
): Promise<LayeredSummary> {
  const docIds = input.documents.map((d) => d.id);
  const keyFactsHash = buildKeyFactsHash({
    documentIds: docIds,
    totalPages: input.totalPages,
    latestAnalysisVersion: input.latestAnalysisVersion,
    keyDates: input.keyDates,
    mainRisks: input.mainRisks,
  });

  const cache = input.cache ?? noopLayeredSummaryCache;

  try {
    const cached = await cache.get({ caseId: input.caseId, orgId: input.orgId });
    if (cached) {
      const cachedHash = cached.source?.keyFactsHash;
      const cachedDocIds = (cached.source?.documentIds ?? []).slice().sort().join(",");
      const currentDocIds = docIds.slice().sort().join(",");
      if (cachedHash === keyFactsHash && cachedDocIds === currentDocIds) {
        return cached;
      }
    }
  } catch (err) {
    // cache read should never break callers
    console.warn("[layered-summary] cache read failed (non-fatal):", err);
  }

  const layered = buildLayeredSummary(input);

  // Best-effort cache write; never fail the caller
  try {
    await cache.set({ caseId: input.caseId, orgId: input.orgId, layeredSummary: layered });
  } catch (err) {
    console.warn("[layered-summary] cache write failed (non-fatal):", err);
  }

  return layered;
}


