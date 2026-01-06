/**
 * Case Snapshot Adapter
 * 
 * Normalizes API responses into a single CaseSnapshot object for UI consumption.
 * This is a mapping/normalization layer only - does NOT recompute analysis or infer facts.
 * 
 * DEV-only console warnings if unexpected shapes are received.
 */

import { safeFetch } from "@/lib/utils/safe-fetch";

export type CaseSnapshot = {
  caseMeta: {
    title: string | null;
    opponent: string | null;
    role: string | null;
    lastUpdatedAt: string | null;
    hearingNextAt: string | null;
  };
  analysis: {
    hasVersion: boolean;
    mode: "none" | "preview" | "complete";
    docCount?: number;
    domainCoverage?: number;
    canShowStrategyOutputs: boolean; // Single source of truth: true only when analysis_mode is preview/complete AND extraction threshold met
    extractionOk?: boolean; // Exposed for status strip logic
  };
  charges: ChargeItem[];
  evidence: {
    documents: DocItem[];
    missingEvidence: MissingItem[];
    disclosureItems: DisclosureItem[];
  };
  strategy: {
    statusLabel: string;
    hasRenderableData: boolean;
    primary?: string;
    fallbacks?: string[];
    confidence?: "HIGH" | "MEDIUM" | "LOW";
    exhaustion?: string;
    pivotTriggers?: string[];
  };
  actions: {
    nextSteps: NextStepItem[];
  };
  decisionLog: {
    currentPosition?: {
      position: string;
      rationale: string | null;
      timestamp: string;
    };
    history: Array<{
      position: string;
      rationale: string | null;
      timestamp: string;
    }>;
  };
};

export type ChargeItem = {
  id: string;
  offence: string;
  section: string | null;
  status: string;
  location: string | null;
  aliases?: string[];
};

export type DocItem = {
  id: string;
  name: string;
  type?: string;
  createdAt: string;
};

export type MissingItem = {
  area: string;
  label: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  notes?: string;
  status: "MISSING" | "REQUESTED" | "RECEIVED" | "UNKNOWN" | "UNASSESSED";
};

export type DisclosureItem = {
  item: string;
  status: "Outstanding" | "Partial" | "Received" | "Unknown";
  lastAction?: string;
  date?: string;
  notes?: string;
};

export type NextStepItem = {
  id: string;
  title: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  dueDate?: string;
};

/**
 * Build a CaseSnapshot from API responses
 */
export async function buildCaseSnapshot(caseId: string): Promise<CaseSnapshot> {
  // Fetch all required data in parallel
  const [
    caseMetaResult,
    analysisResult,
    chargesResult,
    strategyResult,
    commitmentResult,
    hearingsResult,
    documentsResult,
  ] = await Promise.all([
    safeFetch<any>(`/api/cases/${caseId}`).catch(() => ({ ok: false, data: null, error: null })),
    safeFetch<any>(`/api/cases/${caseId}/analysis/version/latest`).catch(() => ({ ok: false, data: null, error: null })),
    safeFetch<any>(`/api/criminal/${caseId}/charges`).catch(() => ({ ok: false, data: null, error: null })),
    safeFetch<any>(`/api/criminal/${caseId}/strategy-analysis`).catch(() => ({ ok: false, data: null, error: null })),
    safeFetch<any>(`/api/criminal/${caseId}/strategy-commitment`).catch(() => ({ ok: false, data: null, error: null })),
    safeFetch<any>(`/api/criminal/${caseId}/hearings`).catch(() => ({ ok: false, data: null, error: null })),
    // Documents - using a generic endpoint or we'll need to create one
    safeFetch<any>(`/api/cases/${caseId}/documents`).catch(() => ({ ok: false, data: null, error: null })),
  ]);

  // Normalize case metadata
  const caseData = caseMetaResult.data?.data || caseMetaResult.data || {};
  
  // Get next hearing from hearings data
  const hearingsData = hearingsResult.data?.hearings || [];
  const now = new Date();
  const nextHearing = hearingsData
    .filter((h: any) => h.hearingDate && new Date(h.hearingDate).getTime() >= now.getTime())
    .sort((a: any, b: any) => new Date(a.hearingDate).getTime() - new Date(b.hearingDate).getTime())[0];
  
  const caseMeta = {
    title: caseData.title || caseData.name || null,
    opponent: caseData.opponent || null,
    role: caseData.practice_area || null,
    lastUpdatedAt: caseData.updated_at || caseData.updatedAt || null,
    hearingNextAt: nextHearing?.hearingDate || null,
  };

  // Normalize analysis data
  const analysisData = analysisResult.data?.data || analysisResult.data || {};
  const analysisMode = analysisData.analysis_mode || (analysisData.version_number ? "complete" : "none") as "none" | "preview" | "complete";
  const hasVersion = analysisData.has_analysis_version === true || analysisData.version_number !== null;
  const docCount = analysisData.docCount || analysisData.doc_count || undefined;
  const rawCharsTotal = analysisData.rawCharsTotal || analysisData.raw_chars_total || 0;
  
  // Extraction threshold: docCount >= 2 AND rawCharsTotal >= 1000 (matches analysis gate logic)
  const extractionOk = (docCount !== undefined && docCount >= 2) && rawCharsTotal >= 1000;
  
  // Single source of truth: canShowStrategyOutputs
  // true only when analysis_mode is preview/complete AND extraction threshold met
  // OR when strategy data already exists (from previous analysis)
  const strategyDataExists = strategyResult.ok && (
    (strategyResult.data?.data?.routes?.length > 0) ||
    (strategyResult.data?.data?.recommendation) ||
    (strategyResult.data?.routes?.length > 0) ||
    (strategyResult.data?.recommendation)
  );
  
  const canShowStrategyOutputs = 
    (analysisMode === "preview" || analysisMode === "complete") && 
    (extractionOk || strategyDataExists);
  
  const analysis = {
    hasVersion,
    mode: analysisMode,
    docCount,
    domainCoverage: undefined, // Not available from current API
    canShowStrategyOutputs,
    extractionOk, // Expose for status strip logic
  };

  // Normalize charges
  const chargesData = chargesResult.data?.data?.charges || chargesResult.data?.charges || [];
  const charges: ChargeItem[] = Array.isArray(chargesData)
    ? chargesData.map((c: any) => ({
        id: c.id || `charge-${Math.random()}`,
        offence: c.offence || "Unknown offence",
        section: c.section || null,
        status: c.status || "pending",
        location: c.location || null,
        aliases: c.aliases || [],
      }))
    : [];

  // Normalize evidence (documents + missing evidence)
  const missingEvidenceData = analysisData.missing_evidence || [];
  const missingEvidence: MissingItem[] = Array.isArray(missingEvidenceData)
    ? missingEvidenceData.map((item: any) => ({
        area: item.area || "other",
        label: item.label || "Unknown evidence item",
        priority: (item.priority || "MEDIUM") as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
        notes: item.notes || undefined,
        status: (item.status || "UNASSESSED") as "MISSING" | "REQUESTED" | "RECEIVED" | "UNKNOWN" | "UNASSESSED",
      }))
    : [];

  // Normalize documents
  const documentsData = documentsResult.data?.data?.documents || documentsResult.data?.documents || [];
  const documents: DocItem[] = Array.isArray(documentsData)
    ? documentsData.map((doc: any) => ({
        id: doc.id || `doc-${Math.random()}`,
        name: doc.name || "Unknown document",
        type: doc.type || undefined,
        createdAt: doc.created_at || doc.createdAt || new Date().toISOString(),
      }))
    : [];

  // Disclosure items - derive from missing evidence
  const disclosureItems: DisclosureItem[] = missingEvidence.map((item) => ({
    item: item.label,
    status: item.status === "RECEIVED" ? "Received" : item.status === "REQUESTED" ? "Partial" : item.status === "MISSING" ? "Outstanding" : "Unknown",
    lastAction: undefined,
    date: undefined,
    notes: item.notes,
  }));

  // Normalize strategy data
  const strategyData = strategyResult.data?.data || strategyResult.data || {};
  const strategyRoutes = strategyData.routes || [];
  const recommendation = strategyData.recommendation;
  
  const strategy = {
    statusLabel: analysis.mode === "complete" ? "Complete" : analysis.mode === "preview" ? "Preview (gated)" : "Not run",
    hasRenderableData: strategyRoutes.length > 0 || !!recommendation || !!strategyData.recommendedStrategy,
    primary: recommendation?.recommended || strategyData.recommendedStrategy?.primaryAngle?.angleType || undefined,
    fallbacks: recommendation?.ranking?.slice(1).map((r: any) => r.route) || undefined,
    confidence: recommendation?.confidence || undefined,
    exhaustion: undefined, // Not available from current API
    pivotTriggers: recommendation?.flipConditions?.map((fc: any) => fc.trigger) || undefined,
  };

  // Normalize commitment/decision log
  const commitmentData = commitmentResult.data?.data || null;
  const decisionLog = {
    currentPosition: commitmentData
      ? {
          position: commitmentData.primary_strategy || commitmentData.primary || "Unknown",
          rationale: commitmentData.title || null,
          timestamp: commitmentData.committed_at || commitmentData.committedAt || new Date().toISOString(),
        }
      : undefined,
    history: commitmentData ? [{
      position: commitmentData.primary_strategy || commitmentData.primary || "Unknown",
      rationale: commitmentData.title || null,
      timestamp: commitmentData.committed_at || commitmentData.committedAt || new Date().toISOString(),
    }] : [],
  };

  // Next steps - empty for now (would need separate endpoint)
  const actions = {
    nextSteps: [] as NextStepItem[],
  };

  // DEV-only structured logging for endpoint status
  if (process.env.NODE_ENV !== "production") {
    const endpointStatus = {
      analysis_mode: analysis.mode,
      has_analysis_version: analysis.hasVersion,
      doc_count: analysis.docCount,
      extraction_ok: extractionOk,
      canShowStrategyOutputs: analysis.canShowStrategyOutputs,
    };
    console.log("[CaseSnapshot] Strategy gating:", JSON.stringify(endpointStatus, null, 2));
    
    if (!analysisResult.ok && analysisResult.error) {
      console.warn(`[CaseSnapshot] Analysis fetch failed: ${analysisResult.error}`);
    }
    if (!chargesResult.ok && chargesResult.error) {
      console.warn(`[CaseSnapshot] Charges fetch failed: ${chargesResult.error}`);
    }
    if (!strategyResult.ok && strategyResult.error) {
      console.warn(`[CaseSnapshot] Strategy fetch failed: ${strategyResult.error}`);
    }
  }

  return {
    caseMeta,
    analysis,
    charges,
    evidence: {
      documents,
      missingEvidence,
      disclosureItems,
    },
    strategy,
    actions,
    decisionLog,
  };
}

