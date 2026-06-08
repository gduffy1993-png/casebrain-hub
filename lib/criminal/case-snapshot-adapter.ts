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
    /** Phase 4: Derived stage (pre_ptph, trial_prep, sentencing, post_charge, unknown). */
    caseStage?: string;
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
    /** Phase 1: Confidence / basis of strategy – what this strategy is based on. */
    strategyBasisLabel: string;
    strategyBasisReason?: string;
  };
  charges: ChargeItem[];
  evidence: {
    documents: DocItem[];
    missingEvidence: MissingItem[];
    disclosureItems: DisclosureItem[];
    /** Phase 4: Disclosure request/chase timeline (requested, chased, served, etc.). */
    disclosureTimeline?: Array<{ item: string; action: string; date: string; note?: string }>;
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
    /** When strategy was last generated (ISO string). */
    strategyUpdatedAt?: string;
    /** Short reason (e.g. "Based on 4 documents (12,000 chars).") for "Why strategy changed". */
    strategyUpdateReason?: string;
    /** Phase 3: Burden Map – what prosecution must prove, strength, defence leverage */
    burdenMap?: Array<{ id: string; label: string; support: string; leverage: string }>;
    /** Phase 3: Pressure points – missing docs, weak inferences, disclosure gaps */
    pressurePoints?: Array<{ id: string; label: string; priority?: string; reason?: string }>;
    /** Phase 5: Solicitor instructions / overrides ("I disagree with this assessment" or "Client instructions: …"). */
    solicitorInstructions?: string | null;
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
  /** Resolved offence (override > charges + matter + bundle) for Overview and Strategy */
  resolvedOffence: {
    offenceType: string;
    label: string;
    source: "charges" | "matter" | "bundle" | "unknown" | "override";
    /** True when offence is in supported taxonomy and we have offence-specific strategy. */
    isSupported: boolean;
    /** Short label for UI: "Offence-specific" vs "Generic – add charge sheet". */
    coverageLabel: string;
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
  /** full = raw text extracted; summary_only = only summary/aiSummary; no_text = none */
  extractionStatus?: "full" | "summary_only" | "no_text";
  extractionMessage?: string;
  extractionCharCount?: number;
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
  /** Priority from missing evidence (for sort/group: critical → high → satisfied) */
  priority?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
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
    offenceResult,
    disclosureTimelineResult,
    strategyNotesResult,
  ] = await Promise.all([
    safeFetch<any>(`/api/cases/${caseId}`).catch(() => ({ ok: false, data: null, error: null })),
    safeFetch<any>(`/api/cases/${caseId}/analysis/version/latest`).catch(() => ({ ok: false, data: null, error: null })),
    safeFetch<any>(`/api/criminal/${caseId}/charges`).catch(() => ({ ok: false, data: null, error: null })),
    safeFetch<any>(`/api/criminal/${caseId}/strategy-analysis`).catch(() => ({ ok: false, data: null, error: null })),
    safeFetch<any>(`/api/criminal/${caseId}/strategy-commitment`).catch(() => ({ ok: false, data: null, error: null })),
    safeFetch<any>(`/api/criminal/${caseId}/hearings`).catch(() => ({ ok: false, data: null, error: null })),
    safeFetch<any>(`/api/cases/${caseId}/documents`).catch(() => ({ ok: false, data: null, error: null })),
    safeFetch<any>(`/api/criminal/${caseId}/offence`).catch(() => ({ ok: false, data: null, error: null })),
    safeFetch<any>(`/api/criminal/${caseId}/disclosure-timeline`).catch(() => ({ ok: false, data: null, error: null })),
    safeFetch<any>(`/api/criminal/${caseId}/strategy-notes`).catch(() => ({ ok: false, data: null, error: null })),
  ]);

  // Normalize case metadata
  const caseData = caseMetaResult.data?.data || caseMetaResult.data || {};
  
  // Get next hearing and derive case stage from hearings data
  const hearingsData = hearingsResult.data?.hearings || [];
  const now = new Date();
  const nextHearing = hearingsData
    .filter((h: any) => h.hearingDate && new Date(h.hearingDate).getTime() >= now.getTime())
    .sort((a: any, b: any) => new Date(a.hearingDate).getTime() - new Date(b.hearingDate).getTime())[0];
  const nextType = (nextHearing?.hearingType ?? "").toLowerCase();
  let caseStage = "unknown";
  if (nextType.includes("trial")) caseStage = "trial_prep";
  else if (nextType.includes("sentenc")) caseStage = "sentencing";
  else if (nextType.includes("ptph") || nextType.includes("pcmh") || nextType.includes("case management")) caseStage = "pre_ptph";
  else if (nextType.includes("first") || nextType.includes("plea") || nextType.includes("mention")) caseStage = "post_charge";
  else if (hearingsData.length > 0) caseStage = "pre_ptph";

  const caseMeta = {
    title: caseData.title || caseData.name || null,
    opponent: caseData.opponent || null,
    role: caseData.practice_area || null,
    lastUpdatedAt: caseData.updated_at || caseData.updatedAt || null,
    hearingNextAt: nextHearing?.hearingDate || null,
    hearingNextType: nextHearing?.hearingType || null,
    caseStage,
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

  // Normalize documents (pass through extraction feedback from API)
  const documentsData = documentsResult.data?.data?.documents || documentsResult.data?.documents || [];
  const documents: DocItem[] = Array.isArray(documentsData)
    ? documentsData.map((doc: any) => ({
        id: doc.id || `doc-${Math.random()}`,
        name: doc.name || "Unknown document",
        type: doc.type || undefined,
        createdAt: doc.created_at || doc.createdAt || new Date().toISOString(),
        extractionStatus: doc.extractionStatus === "full" || doc.extractionStatus === "summary_only" || doc.extractionStatus === "no_text" ? doc.extractionStatus : undefined,
        extractionMessage: typeof doc.extractionMessage === "string" ? doc.extractionMessage : undefined,
        extractionCharCount: typeof doc.extractionCharCount === "number" ? doc.extractionCharCount : undefined,
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
    strategyBasisLabel: "", // Set below after resolvedOffence
    strategyBasisReason: undefined as string | undefined,
  };

  // Disclosure items - derive from missing evidence (include priority for sort/group)
  const disclosureItems: DisclosureItem[] = missingEvidence.map((item) => ({
    item: item.label,
    status: item.status === "RECEIVED" ? "Received" : item.status === "REQUESTED" ? "Partial" : item.status === "MISSING" ? "Outstanding" : "Unknown",
    priority: item.priority,
    lastAction: undefined,
    date: undefined,
    notes: item.notes,
  }));

  // Phase 4: Disclosure timeline (requested / chased / served)
  const timelineData = disclosureTimelineResult?.data?.data ?? disclosureTimelineResult?.data ?? {};
  const rawEntries = Array.isArray(timelineData.entries) ? timelineData.entries : [];
  const disclosureTimeline = rawEntries.slice(0, 30).map((e: any) => ({
    item: e.item ?? "",
    action: e.action ?? "",
    date: e.date ?? e.action_date ?? "",
    note: e.note,
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
    strategyUpdatedAt: strategyDataRaw.strategyUpdatedAt,
    strategyUpdateReason: strategyDataRaw.strategyUpdateReason,
    burdenMap: Array.isArray(strategyDataRaw.burdenMap) ? strategyDataRaw.burdenMap : undefined,
    pressurePoints: Array.isArray(strategyDataRaw.pressurePoints) ? strategyDataRaw.pressurePoints : undefined,
    solicitorInstructions:
      strategyNotesResult?.ok && strategyNotesResult?.data != null
        ? (strategyNotesResult.data?.data?.strategy_notes ?? strategyNotesResult.data?.strategy_notes ?? null)
        : null,
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

  const offenceData = offenceResult?.data ?? strategyDataRaw?.resolvedOffence ?? null;
  const offenceSource = offenceData?.source === "charges" || offenceData?.source === "matter" || offenceData?.source === "bundle" || offenceData?.source === "unknown" || offenceData?.source === "override"
    ? offenceData.source
    : "unknown" as const;
  const offenceType = offenceData && typeof offenceData.offenceType === "string" ? offenceData.offenceType : "other";
  const isSupportedOffence = offenceType !== "other" && offenceSource !== "unknown";
  const resolvedOffence = offenceData && typeof offenceData.offenceType === "string"
    ? {
        offenceType: offenceData.offenceType,
        label: typeof offenceData.label === "string" ? offenceData.label : "Unknown – add charge sheet / evidence for offence-specific strategy",
        source: offenceSource,
        isSupported: isSupportedOffence,
        coverageLabel: isSupportedOffence ? "Offence-specific" : "Generic – add charge sheet for offence-specific strategy",
      }
    : {
        offenceType: "other",
        label: "Unknown – add charge sheet / evidence for offence-specific strategy",
        source: "unknown" as const,
        isSupported: false,
        coverageLabel: "Generic – add charge sheet for offence-specific strategy",
      };

  // Strategy basis: concrete numbers (docs, chars) so it's not vague; tier for quality signal
  const docN = typeof docCount === "number" ? docCount : 0;
  const charLabel = rawCharsTotal >= 1000
    ? `${Math.round(rawCharsTotal / 1000)}k chars`
    : rawCharsTotal > 0
      ? `${rawCharsTotal.toLocaleString()} chars`
      : null;
  const basisNumbers = docN > 0 && charLabel
    ? `${docN} doc${docN !== 1 ? "s" : ""}, ${charLabel}`
    : docN > 0
      ? `${docN} doc${docN !== 1 ? "s" : ""}`
      : null;

  if (offenceSource === "unknown" || offenceType === "other") {
    analysisWithBundle.strategyBasisLabel = "Add charge sheet or key evidence for offence-specific strategy";
    analysisWithBundle.strategyBasisReason = "Offence not identified.";
  } else if (basisNumbers) {
    const tierLabel = bundle.capabilityTier === "full"
      ? "full bundle"
      : bundle.capabilityTier === "partial"
        ? "partial bundle"
        : "summaries only";
    analysisWithBundle.strategyBasisLabel = `Based on: ${basisNumbers} (${tierLabel})`;
    analysisWithBundle.strategyBasisReason =
      bundle.capabilityTier === "full"
        ? "Strategy uses full bundle content."
        : "Add key documents for stronger strategy.";
  } else if (bundle.capabilityTier === "full") {
    analysisWithBundle.strategyBasisLabel = "Based on: full bundle";
    analysisWithBundle.strategyBasisReason = "Strategy uses full bundle content.";
  } else if (bundle.capabilityTier === "partial") {
    analysisWithBundle.strategyBasisLabel = "Based on: partial bundle";
    analysisWithBundle.strategyBasisReason = "Add key documents for stronger strategy.";
  } else {
    analysisWithBundle.strategyBasisLabel = "Based on: summaries only";
    analysisWithBundle.strategyBasisReason = "Add key documents for better strategy.";
  }

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
      disclosureTimeline: disclosureTimeline.length ? disclosureTimeline : undefined,
    },
    strategy,
    actions,
    decisionLog,
    resolvedOffence,
  };
}

