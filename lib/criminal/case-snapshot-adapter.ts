/**
 * Case Snapshot Adapter
 * 
 * Normalizes API responses into a single CaseSnapshot object for UI consumption.
 * This is a mapping/normalization layer only - does NOT recompute analysis or infer facts.
 * 
 * DEV-only console warnings if unexpected shapes are received.
 */

import { safeFetch } from "@/lib/utils/safe-fetch";
import {
  computeBundleCompleteness,
  type BundleCompletenessFlags,
  type CapabilityTier,
} from "@/lib/criminal/bundle-completeness-score";

export type CaseSnapshot = {
  caseMeta: {
    title: string | null;
    opponent: string | null;
    role: string | null;
    lastUpdatedAt: string | null;
    hearingNextAt: string | null;
    hearingNextType: string | null;
  };
  analysis: {
    hasVersion: boolean;
    mode: "none" | "preview" | "complete";
    docCount?: number;
    domainCoverage?: number;
    canShowStrategyOutputs: boolean; // Legacy: maps to canShowStrategyFull
    canShowStrategyPreview: boolean; // Minimal preview when strategy exists OR analysis version exists
    canShowStrategyFull: boolean; // Deep strategy UI only when extraction threshold met
    extractionOk?: boolean; // Exposed for status strip logic
    // Phase A: Bundle completeness (doc-metadata based)
    completenessScore: number; // 0–100
    completenessFlags: BundleCompletenessFlags;
    capabilityTier: CapabilityTier; // thin | partial | full
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
    strategyDataExists: boolean; // Explicit flag: true only when real strategy output exists
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
    hearingNextType: nextHearing?.hearingType || null,
  };

  // Normalize analysis data
  const analysisData = analysisResult.data?.data || analysisResult.data || {};
  const analysisMode = analysisData.analysis_mode || (analysisData.version_number ? "complete" : "none") as "none" | "preview" | "complete";
  const hasVersion = analysisData.has_analysis_version === true || analysisData.version_number !== null;
  const docCount = analysisData.docCount || analysisData.doc_count || undefined;
  const rawCharsTotal = analysisData.rawCharsTotal || analysisData.raw_chars_total || 0;
  
  // Extraction threshold: docCount >= 2 AND rawCharsTotal >= 1000 (matches analysis gate logic)
  const extractionOk = (docCount !== undefined && docCount >= 2) && rawCharsTotal >= 1000;
  
  // Strategy data exists check - check all possible response shapes
  // Normalize to ONE canonical internal shape
  // PHASE 1 FIX: Check for ALL strategy fields (attack_paths, cps_responses, kill_switches, pivot_plan)
  const strategyDataRaw = strategyResult.data?.data || strategyResult.data || {};
  const hasRoutes = Array.isArray(strategyDataRaw.routes) && strategyDataRaw.routes.length > 0;
  const hasRecommendation = !!strategyDataRaw.recommendation;
  const hasNarrative = !!strategyDataRaw.solicitor_narrative || !!strategyDataRaw.narrative;
  
  // Check for attack paths in routes
  const hasAttackPaths = hasRoutes && strategyDataRaw.routes.some((r: any) => 
    Array.isArray(r.attackPaths) && r.attackPaths.length > 0
  );
  
  // Check for CPS responses in routes
  const hasCPSResponses = hasRoutes && strategyDataRaw.routes.some((r: any) => 
    Array.isArray(r.cpsResponses) && r.cpsResponses.length > 0
  );
  
  // Check for kill switches in routes
  const hasKillSwitches = hasRoutes && strategyDataRaw.routes.some((r: any) => 
    Array.isArray(r.killSwitches) && r.killSwitches.length > 0
  );
  
  // Strategy data exists if ANY of these fields are present
  const strategyDataExists = strategyResult.ok && (
    hasRoutes || 
    hasRecommendation || 
    hasNarrative ||
    hasAttackPaths ||
    hasCPSResponses ||
    hasKillSwitches
  );
  
  // DEV-only: Log strategy endpoint response
  if (process.env.NODE_ENV !== "production") {
    console.log("[CaseSnapshot] Strategy endpoint response:", {
      ok: strategyResult.ok,
      status: 'status' in strategyResult ? strategyResult.status : null,
      error: strategyResult.error,
      responseKeys: strategyResult.ok ? Object.keys(strategyDataRaw) : [],
      hasRoutes,
      hasRecommendation,
      hasNarrative,
      strategyDataExists,
    });
  }
  
  // Two-level gating for strategy display:
  // A) canShowStrategyPreview: minimal preview when strategy exists OR analysis version exists
  // Updated logic per user requirement:
  // Show preview if (analysis_mode is preview/complete OR hasVersion) AND (strategyDataExists OR hasVersion)
  const canShowStrategyPreview = 
    ((analysisMode === "preview" || analysisMode === "complete" || hasVersion) &&
     (strategyDataExists || hasVersion));
  
  // B) canShowStrategyFull: PHASE 1 FIX - Display existing strategy data regardless of extractionOk
  // extractionOk only affects CONFIDENCE CAPS, not visibility
  // Show full strategy if strategy data exists AND analysis mode is preview/complete
  const canShowStrategyFull = 
    strategyDataExists &&
    (analysisMode === "preview" || analysisMode === "complete");
  
  // Legacy: canShowStrategyOutputs (for backward compatibility, maps to canShowStrategyFull)
  const canShowStrategyOutputs = canShowStrategyFull;
  
  const analysis = {
    hasVersion,
    mode: analysisMode,
    docCount,
    domainCoverage: undefined, // Not available from current API
    canShowStrategyOutputs: canShowStrategyFull, // Legacy compatibility
    canShowStrategyPreview,
    canShowStrategyFull,
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

  // Phase A: Bundle completeness (deterministic, doc metadata + content-based detection)
  // Pass extracted_json for content-based witness statement detection
  const bundle = computeBundleCompleteness(
    Array.isArray(documentsData)
      ? documentsData.map((d: any) => ({ 
          name: d?.name ?? null, 
          type: d?.type ?? null,
          extracted_json: d?.extracted_json ?? undefined, // Include extracted content for content-based detection
        }))
      : []
  );
  const analysisWithBundle = {
    ...analysis,
    completenessScore: bundle.score,
    completenessFlags: bundle.flags,
    capabilityTier: bundle.capabilityTier,
  };

  // Disclosure items - derive from missing evidence
  const disclosureItems: DisclosureItem[] = missingEvidence.map((item) => ({
    item: item.label,
    status: item.status === "RECEIVED" ? "Received" : item.status === "REQUESTED" ? "Partial" : item.status === "MISSING" ? "Outstanding" : "Unknown",
    lastAction: undefined,
    date: undefined,
    notes: item.notes,
  }));

  // Normalize strategy data - use the same raw data we checked above
  const strategyRoutes = Array.isArray(strategyDataRaw.routes) ? strategyDataRaw.routes : [];
  const recommendation = strategyDataRaw.recommendation;
  
  // hasRenderableData: true if we have routes, recommendation, or narrative (use same check as strategyDataExists)
  const hasRenderableData = hasRoutes || hasRecommendation || hasNarrative;
  
  const strategy = {
    statusLabel: analysis.mode === "complete" ? "Complete" : analysis.mode === "preview" ? "Preview (gated)" : "Not run",
    hasRenderableData,
    strategyDataExists, // Explicit flag: true only when real strategy output exists (routes/recommendation/narrative)
    // Only set primary/confidence/etc if strategyDataExists is true (no fabricated values)
    primary: strategyDataExists ? (recommendation?.recommended || strategyDataRaw.recommendedStrategy?.primaryAngle?.angleType || undefined) : undefined,
    fallbacks: strategyDataExists ? (recommendation?.ranking?.slice(1).map((r: any) => r.route) || undefined) : undefined,
    confidence: strategyDataExists ? (recommendation?.confidence || undefined) : undefined,
    exhaustion: undefined, // Not available from current API
    pivotTriggers: strategyDataExists ? (recommendation?.flipConditions?.map((fc: any) => fc.trigger) || undefined) : undefined,
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

  // DEV-only structured logging for endpoint status (single source of truth)
  if (process.env.NODE_ENV !== "production") {
    const endpointStatus = {
      hasVersion: analysisWithBundle.hasVersion,
      analysis_mode: analysisWithBundle.mode,
      bundle: {
        score: analysisWithBundle.completenessScore,
        tier: analysisWithBundle.capabilityTier,
        flags: analysisWithBundle.completenessFlags,
      },
      strategyDataExists,
      canShowStrategyPreview: analysisWithBundle.canShowStrategyPreview,
      canShowStrategyFull: analysisWithBundle.canShowStrategyFull,
      doc_count: analysisWithBundle.docCount,
      raw_chars_total: rawCharsTotal,
      extraction_ok: extractionOk,
    };
    console.log("[CaseSnapshot] Strategy gating (single source of truth):", JSON.stringify(endpointStatus, null, 2));
    
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
    analysis: analysisWithBundle,
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

