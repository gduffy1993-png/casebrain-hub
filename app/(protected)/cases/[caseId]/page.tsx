import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ClipboardEdit, Download } from "lucide-react";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  ExtractedCaseFacts,
  PiCaseRecord,
  PiMedicalReport,
  PiOffer,
  PiHearing,
  PiDisbursement,
  HousingCaseRecord,
  HousingDefect,
} from "@/types";
import { ConditionalPortalShare } from "@/components/cases/ConditionalPortalShare";
import { CaseTypeSelector } from "@/components/cases/CaseTypeSelector";
import { PiCaseOverview } from "@/components/pi/PiCaseOverview";
import { PiValuationHelper } from "@/components/pi/PiValuationHelper";
import { PiLetterPreview } from "@/components/pi/PiLetterPreview";
import { PiProtocolTimeline } from "@/components/pi/PiProtocolTimeline";
import { OicMedcoPanel } from "@/components/pi/OicMedcoPanel";
import { HousingCaseOverview } from "@/components/housing/HousingCaseOverview";
import { HousingCompliancePanel } from "@/components/housing/HousingCompliancePanel";
import { HousingTimelineBuilder } from "@/components/housing/HousingTimelineBuilder";
import { HousingQuantumCalculator } from "@/components/housing/HousingQuantumCalculator";
import { HousingDeadlineTracker } from "@/components/housing/HousingDeadlineTracker";
import { ScheduleOfDisrepairPanel } from "@/components/housing/ScheduleOfDisrepairPanel";
import { BundleCheckerPanel } from "@/components/housing/BundleCheckerPanel";
import { HousingHazardPanel } from "@/components/housing/HousingHazardPanel";
import { HousingAnalysisSection } from "@/components/housing/HousingAnalysisSection";
import { AggressiveDefensePanel } from "@/components/housing/AggressiveDefensePanel";
import { PICaseDetailsSection } from "@/components/pi/PICaseDetailsSection";
import { AggressiveDefensePanel as PiAggressiveDefensePanel } from "@/components/pi/AggressiveDefensePanel";
import { AggressiveDefensePanel as FamilyAggressiveDefensePanel } from "@/components/family/AggressiveDefensePanel";
import { SupervisionPackPanel } from "@/components/housing/SupervisionPackPanel";
import { CriminalCaseView } from "@/components/criminal/CriminalCaseView";
import { LitigationGuidancePanel } from "@/components/core/LitigationGuidancePanel";
import { RiskAlertsPanel } from "@/components/core/RiskAlertsPanel";
import { KeyIssuesPanel } from "@/components/core/KeyIssuesPanel";
import { buildKeyIssues } from "@/lib/key-issues";
import { InCaseSearchBox } from "@/components/core/InCaseSearchBox";
import { MissingEvidencePanel } from "@/components/core/MissingEvidencePanel";
// TODO: Re-implement when components are restored
// import { EvidenceTrackerPanel } from "@/components/evidence/EvidenceTrackerPanel";
// import { AuditTrailPanel } from "@/components/audit/AuditTrailPanel";
import { CaseHeatmapPanel } from "@/components/core/CaseHeatmapPanel";
import { CaseNotesPanel } from "@/components/core/CaseNotesPanel";
import { NextStepPanel } from "@/components/core/NextStepPanel";
import { BundlePhaseAPanel } from "@/components/cases/BundlePhaseAPanel";
import { BundleNavigatorFullPanel } from "@/components/cases/BundleNavigatorFullPanel";
import { findMissingEvidence } from "@/lib/missing-evidence";
import { computeCaseHeatmap } from "@/lib/heatmap";
import { calculateLimitation } from "@/lib/core/limitation";
import { calculateNextStep, calculateAllNextSteps, calculateChaserAlerts } from "@/lib/next-step";
import type { RiskFlag, LimitationInfo, PracticeArea, RiskStatus } from "@/lib/types/casebrain";
import { normalizePracticeArea } from "@/lib/types/casebrain";
import { resolvePracticeAreaFromSignals } from "@/lib/strategic/practice-area-filters";
import { Badge } from "@/components/ui/badge";
import { CaseArchiveButton } from "@/components/cases/CaseArchiveButton";
import { CasePackExportButton, CasePackExportPanel } from "@/components/cases/CasePackExportButton";
import { CaseOverviewExportButton } from "@/components/cases/CaseOverviewExportButton";
import { DocumentMapPanel } from "@/components/cases/DocumentMapPanel";
import { CaseKeyFactsPanel } from "@/components/cases/KeyFactsPanel";
import { InstructionsToCounselPanel } from "@/components/cases/InstructionsToCounselPanel";
import { SupervisorReviewPanel } from "@/components/cases/SupervisorReviewPanel";
import { DeadlineManagementPanel } from "@/components/core/DeadlineManagementPanel";
import { DeadlineCalendarWrapper } from "@/components/calendar/DeadlineCalendarWrapper";
import { TimeTracker } from "@/components/billing/TimeTracker";
import { InvoiceList } from "@/components/billing/InvoiceList";
import { CaseEmailsPanel } from "@/components/email/CaseEmailsPanel";
import { EmailComposer } from "@/components/email/EmailComposer";
import { CommunicationHistoryPanel } from "@/components/communication/CommunicationHistoryPanel";
import { ESignaturePanel } from "@/components/esignature/ESignaturePanel";
import { CalendarEventsPanel } from "@/components/calendar/CalendarEventsPanel";
import { SMSPanel } from "@/components/sms/SMSPanel";
import { DocumentVersionsPanel } from "@/components/documents/DocumentVersionsPanel";
import { CustomReportsPanel } from "@/components/reporting/CustomReportsPanel";
import { ClientMoneyPanel } from "@/components/trust/ClientMoneyPanel";
import { ProfitabilityCard } from "@/components/case-profitability/ProfitabilityCard";
import { SettlementCalculatorPanel } from "@/components/settlement/SettlementCalculatorPanel";
import { ClientTimelinePanel } from "@/components/client-expectations/ClientTimelinePanel";
import { OpponentProfileCard } from "@/components/opponent-behavior/OpponentProfileCard";
import { SettlementCalculator } from "@/components/calculators/SettlementCalculator";
import { PreActionProtocolChecklist } from "@/components/protocol/PreActionProtocolChecklist";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { FileText, Mail, AlertCircle, Search, Target, ListChecks, TrendingUp, FolderOpen, Shield, Home, Calculator, DollarSign, MessageSquare, Phone, Calendar, History, FileCheck, BarChart3, CreditCard, Clock, FileQuestion, BookOpen, Bomb, Skull, Zap, MousePointerClick, Play } from "lucide-react";
import { PracticeAreaSelector } from "@/components/cases/PracticeAreaSelector";
import { CasePageClient } from "@/components/cases/CasePageClient";
import { CaseSummaryPanel } from "@/components/cases/CaseSummaryPanel";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CaseFilesList } from "@/components/cases/CaseFilesList";
import { StrategicIntelligenceSection } from "@/components/strategic/StrategicIntelligenceSection";
import { WitnessAnalysisPanel } from "@/components/cases/WitnessAnalysisPanel";
import { TimelineExploiterPanel } from "@/components/cases/TimelineExploiterPanel";
import { PrecedentsPanel } from "@/components/cases/PrecedentsPanel";
import { NuclearOptionsPanel } from "@/components/cases/NuclearOptionsPanel";
import { CaseDestroyerPanel } from "@/components/cases/CaseDestroyerPanel";
import { ChainReactionPanel } from "@/components/cases/ChainReactionPanel";
import { TechnicalitiesPanel } from "@/components/cases/TechnicalitiesPanel";
import { ProsecutionTrapsPanel } from "@/components/cases/ProsecutionTrapsPanel";
import { MultiAngleDevastationPanel } from "@/components/cases/MultiAngleDevastationPanel";
import { TacticalCommandCenter } from "@/components/cases/TacticalCommandCenter";
import { NextMovePanel } from "@/components/cases/NextMovePanel";
import { CasePageClientWithActions } from "@/components/cases/CasePageClientWithActions";
import { AnalysisDeltaPanelWrapper } from "@/components/cases/AnalysisDeltaPanelWrapper";
import { EvidenceStrategyHeader } from "@/components/cases/EvidenceStrategyHeader";
import { WhatChangedPanel } from "@/components/cases/WhatChangedPanel";
import { NewEvidenceBanner } from "@/components/cases/NewEvidenceBanner";
import { Plus } from "lucide-react";

type CasePageParams = {
  params: { caseId: string };
};

export default async function CaseDetailPage({ params }: CasePageParams) {
  const caseId = params.caseId;
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  /**
   * ROOT CAUSE OF PAGE CRASHES:
   * 1. Database errors were being thrown (line 89 threw caseError)
   * 2. No error boundaries around heavy panels - one panel failure crashed the entire page
   * 
   * FIXES APPLIED:
   * - Return friendly error page instead of throwing on DB errors
   * - Added ErrorBoundary wrappers around all heavy panels (Health, MissingEvidence, etc.)
   * - CaseSummaryPanel always renders even if data fetch fails
   */
  
  // SAFETY: Always fetch case record safely - never throw on error
  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .select("id, title, summary, extracted_summary, timeline, org_id, practice_area, latest_analysis_version, analysis_stale")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  // Handle database errors gracefully - return friendly error page instead of throwing
  if (caseError) {
    console.error("[CaseDetailPage] Database error:", caseError);
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <div className="p-6 text-center">
            <p className="text-lg font-semibold text-accent mb-2">Unable to load case</p>
            <p className="text-sm text-accent/60">
              There was an error loading this case. Please try again or contact support.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Handle missing case gracefully
  if (!caseRecord) {
    notFound();
  }

  // SAFETY: Wrap all database queries in try-catch to prevent crashes
  let documents: any[] = [];
  let letters: any[] = [];
  let riskFlags: any[] = [];
  let deadlines: any[] = [];

  try {
    const [
      documentsResult,
      lettersResult,
      riskFlagsResult,
      deadlinesResult,
    ] = await Promise.all([
      supabase
        .from("documents")
        .select("id, name, type, uploaded_by, created_at, extracted_json")
        .eq("case_id", caseId)
        .eq("org_id", orgId)
        .order("created_at", { ascending: false }),
      supabase
        .from("letters")
        .select("id, template_id, version, body, updated_at, created_by")
        .eq("case_id", caseId)
        .eq("org_id", orgId) // Multi-tenant isolation: ensure letters belong to this org
        .order("version", { ascending: false }),
      supabase
        .from("risk_flags")
        .select("id, flag_type, severity, description, detected_at, resolved, resolved_at")
        .eq("case_id", caseId)
        .eq("org_id", orgId) // Multi-tenant isolation: ensure risk flags belong to this org
        .order("detected_at", { ascending: false }),
      supabase
        .from("deadlines")
        .select("id, title, due_date")
        .eq("case_id", caseId)
        .eq("org_id", orgId) // Multi-tenant isolation: ensure deadlines belong to this org
        .order("due_date", { ascending: true }),
    ]);

    documents = documentsResult.data ?? [];
    letters = lettersResult.data ?? [];
    riskFlags = riskFlagsResult.data ?? [];
    deadlines = deadlinesResult.data ?? [];

    // Log errors but don't crash
    if (documentsResult.error) {
      console.error("[CaseDetailPage] Error fetching documents:", documentsResult.error);
    }
    if (lettersResult.error) {
      console.error("[CaseDetailPage] Error fetching letters:", lettersResult.error);
    }
    if (riskFlagsResult.error) {
      console.error("[CaseDetailPage] Error fetching risk flags:", riskFlagsResult.error);
    }
    if (deadlinesResult.error) {
      console.error("[CaseDetailPage] Error fetching deadlines:", deadlinesResult.error);
    }
  } catch (error) {
    // SAFETY: If Promise.all fails, log but continue with empty arrays
    console.error("[CaseDetailPage] Error fetching case data:", error);
    // Continue with empty arrays - page will render with missing data rather than crash
  }

  let normalizedPracticeAreaValue = normalizePracticeArea(caseRecord.practice_area);

  // Runtime assert: if criminal tables exist but cases.practice_area is other/null, treat as criminal for UI.
  if (normalizedPracticeAreaValue !== "criminal") {
    try {
      const { data: criminalCaseRow } = await supabase
        .from("criminal_cases")
        .select("id")
        .eq("id", caseId)
        .eq("org_id", orgId)
        .maybeSingle();
      const looksCriminal =
        (documents ?? []).some((d: any) =>
          /(?:\bPACE\b|\bCPIA\b|\bMG6\b|\bMG\s*6\b|\bMG5\b|\bCPS\b|\bcustody\b|\binterview\b|\bcharge\b|\bindictment\b|\bCrown Court\b|\bMagistrates'? Court\b)/i.test(
            `${String(d?.name ?? "")} ${String(d?.type ?? "")}`,
          ),
        ) || false;
      const hasCriminalSignals = Boolean(criminalCaseRow?.id || looksCriminal);
      const resolved = resolvePracticeAreaFromSignals({
        storedPracticeArea: caseRecord.practice_area,
        hasCriminalSignals,
        context: "case-page/render",
      });
      if (resolved === "criminal") {
        normalizedPracticeAreaValue = "criminal";
      }
    } catch {
      // ignore
    }
  }
  const isPiCase =
    caseRecord.practice_area === "pi" || normalizedPracticeAreaValue === "personal_injury" || normalizedPracticeAreaValue === "clinical_negligence";
  const isHousingCase = normalizedPracticeAreaValue === "housing_disrepair";
  const isCriminalCase = normalizedPracticeAreaValue === "criminal";
  const isFamilyCase = normalizedPracticeAreaValue === "family";

  let piCase: PiCaseRecord | null = null;
  let piMedicalReports: PiMedicalReport[] = [];
  let piOffers: PiOffer[] = [];
  let piHearings: PiHearing[] = [];
  let piDisbursements: PiDisbursement[] = [];

  let housingCase: HousingCaseRecord | null = null;
  let housingDefects: HousingDefect[] = [];
  let complianceChecks: Array<{
    rule: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    passed: boolean;
    details?: string;
  }> = [];

  if (isPiCase) {
    try {
      const [
        piCaseResult,
        medicalReportsResult,
        offersResult,
        hearingsResult,
        disbursementsResult,
      ] = await Promise.all([
        supabase.from("pi_cases").select("*").eq("id", caseId).eq("org_id", orgId).maybeSingle(), // Multi-tenant isolation
        supabase.from("pi_medical_reports").select("*").eq("case_id", caseId).eq("org_id", orgId),
        supabase.from("pi_offers").select("*").eq("case_id", caseId).eq("org_id", orgId),
        supabase.from("pi_hearings").select("*").eq("case_id", caseId).eq("org_id", orgId),
        supabase.from("pi_disbursements").select("*").eq("case_id", caseId).eq("org_id", orgId),
      ]);

      piCase = piCaseResult.data ?? null;
      piMedicalReports = medicalReportsResult.data ?? [];
      piOffers = offersResult.data ?? [];
      piHearings = hearingsResult.data ?? [];
      piDisbursements = disbursementsResult.data ?? [];

      // Log errors but don't crash
      if (piCaseResult.error) {
        console.error("[CaseDetailPage] Error fetching PI case:", piCaseResult.error);
      }
      if (medicalReportsResult.error) {
        console.error("[CaseDetailPage] Error fetching medical reports:", medicalReportsResult.error);
      }
      if (offersResult.error) {
        console.error("[CaseDetailPage] Error fetching offers:", offersResult.error);
      }
      if (hearingsResult.error) {
        console.error("[CaseDetailPage] Error fetching hearings:", hearingsResult.error);
      }
      if (disbursementsResult.error) {
        console.error("[CaseDetailPage] Error fetching disbursements:", disbursementsResult.error);
      }
    } catch (error) {
      console.error("[CaseDetailPage] Error fetching PI case data:", error);
      // Continue with null/empty values - page will render with missing data
    }
  }

  if (isHousingCase) {
    try {
      const [
        housingCaseResult,
        defectsResult,
        complianceData,
      ] = await Promise.all([
        supabase.from("housing_cases").select("*").eq("id", caseId).eq("org_id", orgId).maybeSingle(),
        supabase.from("housing_defects").select("*").eq("case_id", caseId).eq("org_id", orgId),
      // Call compliance checks directly instead of HTTP to avoid auth issues
      (async () => {
        try {
          const { runHousingComplianceChecks } = await import("@/lib/housing/compliance");
          // Get housing case data for compliance checks
          const { data: hCase } = await supabase
            .from("housing_cases")
            .select("*")
            .eq("id", caseId)
            .eq("org_id", orgId)
            .maybeSingle();
          
          if (!hCase) {
            return { checks: [] };
          }
          
          // Get defects for dates
          const { data: defects } = await supabase
            .from("housing_defects")
            .select("first_reported_date, repair_date")
            .eq("case_id", caseId)
            .eq("org_id", orgId);
          
          const firstDefectDate = defects && defects.length > 0 && defects[0].first_reported_date
            ? new Date(defects[0].first_reported_date)
            : null;
          const firstRepairDate = defects && defects.length > 0 && defects.find((d) => d.repair_date)?.repair_date
            ? new Date(defects.find((d) => d.repair_date)!.repair_date!)
            : null;
          
          // Get timeline events
          const { data: timelineEvents } = await supabase
            .from("housing_timeline")
            .select("event_date, event_type")
            .eq("case_id", caseId)
            .eq("org_id", orgId)
            .order("event_date", { ascending: true });
          
          let investigationDate: Date | null = null;
          let workStartDate: Date | null = null;
          
          timelineEvents?.forEach((event) => {
            if (event.event_type === "inspection" && !investigationDate) {
              investigationDate = new Date(event.event_date);
            }
            if (event.event_type === "repair_attempt" && !workStartDate) {
              workStartDate = new Date(event.event_date);
            }
          });
          
          const checks = runHousingComplianceChecks({
            firstReportDate: hCase.first_report_date ? new Date(hCase.first_report_date) : null,
            investigationDate,
            workStartDate,
            workCompleteDate: firstRepairDate,
            defectReportedDate: firstDefectDate,
            repairCompletedDate: firstRepairDate,
            noAccessDays: hCase.no_access_days_total ?? 0,
            noAccessCount: hCase.no_access_count ?? 0,
            repairAttempts: hCase.repair_attempts_count ?? 0,
            hazards: [...(hCase.hhsrs_category_1_hazards ?? []), ...(hCase.hhsrs_category_2_hazards ?? [])],
            isSocialLandlord: hCase.landlord_type === "social" || hCase.landlord_type === "council",
            isTenantVulnerable: (hCase.tenant_vulnerability ?? []).length > 0,
            vulnerabilities: hCase.tenant_vulnerability ?? [],
            isUnfitForHabitation: hCase.unfit_for_habitation ?? false,
          });
          
          return { checks: checks };
        } catch {
          return { checks: [] };
        }
      })(),
    ]);

      housingCase = housingCaseResult.data ?? null;
      housingDefects = defectsResult.data ?? [];
      complianceChecks = complianceData?.checks ?? [];

      // Log errors but don't crash
      if (housingCaseResult.error) {
        console.error("[CaseDetailPage] Error fetching housing case:", housingCaseResult.error);
      }
      if (defectsResult.error) {
        console.error("[CaseDetailPage] Error fetching housing defects:", defectsResult.error);
      }
    } catch (error) {
      console.error("[CaseDetailPage] Error fetching housing case data:", error);
      // Continue with null/empty values - page will render with missing data
    }
  }

  // Extract all facts from documents for Awaab detection
  const extractedFacts: ExtractedCaseFacts[] = (documents ?? [])
    .map((doc) => {
      const extracted = doc.extracted_json as ExtractedCaseFacts | null;
      return extracted;
    })
    .filter((f): f is ExtractedCaseFacts => f !== null && f !== undefined);

  const timeline =
    extractedFacts
      .flatMap((f) => f.timeline ?? [])
      .sort((a, b) => a.date.localeCompare(b.date)) ?? [];

  // Extract key issues from documents
  const rawKeyIssues = documents
      ?.flatMap((doc) => {
        const extracted = doc.extracted_json as ExtractedCaseFacts | null;
      return extracted?.keyIssues ?? [];
    })
    .filter((issue, index, arr) => arr.indexOf(issue) === index) ?? [];
  const keyIssues = buildKeyIssues(caseId, rawKeyIssues, caseRecord.practice_area ?? undefined);

  // Calculate limitation info
  const firstDate = documents
    ?.flatMap((doc) => {
      const extracted = doc.extracted_json as ExtractedCaseFacts | null;
      return extracted?.dates ?? [];
    })
    .find((d) => d.label.toLowerCase().includes("incident") || d.label.toLowerCase().includes("accident"));

  // Criminal: do NOT run civil limitation logic (prevents "issue proceedings/standstill" leakage)
  const limitationInfo: LimitationInfo | undefined = (() => {
    if (isCriminalCase) return undefined;
    if (!firstDate) return undefined;

    // Legacy mapping for limitation calculation (which still uses old types internally)
    const limitationPracticeAreaLegacy =
      normalizedPracticeAreaValue === "housing_disrepair"
        ? "housing"
        : normalizedPracticeAreaValue === "personal_injury"
          ? "pi_rta"
          : normalizedPracticeAreaValue === "clinical_negligence"
            ? "clin_neg"
            : "other";

    const limitationResult = calculateLimitation({
      incidentDate: firstDate.isoDate,
      practiceArea: limitationPracticeAreaLegacy as "housing" | "pi_rta" | "pi_general" | "clin_neg" | "other",
    });

    if (!limitationResult) return undefined;

    return {
      caseId,
      causeOfAction:
        normalizedPracticeAreaValue === "housing_disrepair"
          ? "Breach of contract (housing disrepair)"
          : normalizedPracticeAreaValue === "clinical_negligence"
            ? "Clinical negligence"
            : "Personal injury",
      primaryLimitationDate: limitationResult.limitationDate ?? "",
      daysRemaining: limitationResult.daysRemaining ?? 0,
      isExpired: limitationResult.isExpired,
      severity: limitationResult.severity.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      practiceArea: normalizedPracticeAreaValue as import("@/lib/types/casebrain").PracticeArea,
      hasMinor: limitationResult.isMinor,
    };
  })();

  // TODO: legacy missing evidence – replaced by case_analysis_versions
  // Missing evidence is now sourced from case_analysis_versions.missing_evidence
  // This is kept for backward compatibility but MissingEvidencePanel will fetch from versions
  const docsForEvidence = (documents ?? []).map((d) => ({
    name: d.name,
    type: d.type ?? undefined,
    extracted_json: d.extracted_json ?? undefined,
  }));
  const missingEvidence = findMissingEvidence(
    caseId,
    caseRecord.practice_area ?? "general",
    docsForEvidence,
  );

  // Seed evidence items from missing evidence (idempotent)
  // TODO: Re-implement when seedFromMissingEvidence is restored
  // This runs on every page load but won't create duplicates due to unique constraint
  // try {
  //   const { seedEvidenceItemsFromMissingEvidence } = await import("@/lib/evidence/seedFromMissingEvidence");
  //   if (missingEvidence.length > 0) {
  //     await seedEvidenceItemsFromMissingEvidence(caseId, orgId, missingEvidence);
  //   }
  // } catch (error) {
  //   console.warn("[case-page] Failed to seed evidence items:", error);
  //   // Don't fail the page if seeding fails
  // }

  // TODO: Re-implement when EvidenceTrackerPanel is restored
  // Fetch evidence items for the tracker panel
  // const { data: evidenceItemsData } = await supabase
  //   .from("evidence_items")
  //   .select("*")
  //   .eq("case_id", caseId)
  //   .eq("org_id", orgId)
  //   .order("created_at", { ascending: false });

  // Transform to EvidenceItem type
  const evidenceItems: any[] = []; // Temporarily empty array
  // const evidenceItems = (evidenceItemsData ?? []).map((row) => ({
  //   id: row.id,
  //   caseId: row.case_id,
  //   orgId: row.org_id,
  //   practiceArea: row.practice_area,
  //   title: row.title,
  //   category: row.category,
  //   source: row.source,
  //   whyNeeded: row.why_needed,
  //   status: row.status as "outstanding" | "requested" | "received" | "escalated" | "no_longer_needed",
  //   requestedAt: row.requested_at,
  //   lastChasedAt: row.last_chased_at,
  //   escalatedAt: row.escalated_at,
  //   receivedAt: row.received_at,
  //   dueAt: row.due_at,
  //   meta: (row.meta as Record<string, unknown>) || {},
  //   createdAt: row.created_at,
  //   updatedAt: row.updated_at,
  // }));

  // Fetch deadlines ONCE for all uses (risk score, alerts, next steps) - BEFORE risk alerts
  // Call directly instead of HTTP to avoid auth issues
  let deadlineRiskScore: number | undefined = undefined;
  let deadlineSteps: Array<{
    action: string;
    priority: "urgent" | "high" | "medium";
    deadlineId: string;
  }> = [];
  let deadlinesForAlerts: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    daysRemaining: number;
  }> = [];
  
  try {
    const { unifyDeadlines, calculateDeadlineRiskScore, getDeadlineNextSteps } = await import("@/lib/core/deadline-management");
    const { calculateHousingDeadlines } = await import("@/lib/housing/deadlines");
    const { calculateCourtDeadlines } = await import("@/lib/court-deadlines");
    
    // Get case for practice area
    const { data: caseForDeadlines } = await supabase
      .from("cases")
      .select("id, practice_area, status")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();
    
    if (caseForDeadlines) {
      // Calculate deadlines from all sources
      let housingDeadlines: any[] = [];
      if (caseForDeadlines.practice_area === "housing_disrepair" && housingCase) {
        // Get investigation/work dates from timeline
        const { data: timelineEvents } = await supabase
          .from("housing_timeline")
          .select("event_date, event_type")
          .eq("case_id", caseId)
          .eq("org_id", orgId)
          .order("event_date", { ascending: true });
        
        let investigationDate: Date | null = null;
        let workStartDate: Date | null = null;
        
        timelineEvents?.forEach((event) => {
          if (event.event_type === "inspection" && !investigationDate) {
            investigationDate = new Date(event.event_date);
          }
          if (event.event_type === "repair_attempt" && !workStartDate) {
            workStartDate = new Date(event.event_date);
          }
        });
        
        housingDeadlines = calculateHousingDeadlines(
          housingCase as any,
          investigationDate,
          workStartDate,
        );
      }
      
      const courtDeadlines = calculateCourtDeadlines({
        caseId,
        practiceArea: caseForDeadlines.practice_area ?? "other_litigation",
        issuedDate: undefined,
        servedDate: undefined,
      });
      
      // Get manual deadlines from DB
      const { data: manualDeadlines } = await supabase
        .from("deadlines")
        .select("*")
        .eq("case_id", caseId)
        .eq("org_id", orgId);
      
      // Unify all deadlines
      const unified = unifyDeadlines(
        housingDeadlines,
        courtDeadlines,
        (manualDeadlines ?? []).map(d => ({
          id: d.id,
          caseId: caseId,
          title: d.title,
          dueDate: d.due_date,
          description: d.notes,
          category: d.category ?? "MANUAL",
        })),
      );
      
      deadlineRiskScore = calculateDeadlineRiskScore(unified);
      deadlineSteps = getDeadlineNextSteps(unified);
      deadlinesForAlerts = unified.map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        priority: d.priority,
        daysRemaining: d.daysRemaining ?? 0,
      }));
    }
  } catch (err) {
    console.error("[CasePage] Failed to fetch deadlines:", err);
  }

  // Build risk alerts including Awaab detection (for housing cases)
  let riskAlertsForPanel: import("@/lib/core/types").RiskAlert[] = [];
  if (caseRecord.practice_area === "housing_disrepair") {
    try {
      const { buildRiskAlerts } = await import("@/lib/core/risk-alerts");
      
      // Extract first complaint date from housing case or timeline
      let firstComplaintDate: Date | undefined = undefined;
      if (housingCase?.first_report_date) {
        firstComplaintDate = new Date(housingCase.first_report_date);
      } else if (extractedFacts.length > 0) {
        // Try to find first complaint from timeline
        const firstComplaintEvent = extractedFacts
          .flatMap(f => f.timeline ?? [])
          .find(t => 
            t.label.toLowerCase().includes("first complaint") ||
            t.label.toLowerCase().includes("initial report") ||
            t.label.toLowerCase().includes("first report")
          );
        if (firstComplaintEvent) {
          try {
            firstComplaintDate = new Date(firstComplaintEvent.date);
          } catch {
            // Invalid date, ignore
          }
        }
      }
      
      // Infer social landlord from extracted facts if not set in housing case
      let isSocialLandlord = housingCase?.landlord_type === "social" || 
                             housingCase?.landlord_type === "council";
      
      // If not set, check extracted facts for social landlord indicators
      if (!isSocialLandlord && extractedFacts.length > 0) {
        const allText = extractedFacts
          .map(f => `${f.summary} ${f.keyIssues.join(" ")} ${f.parties.map(p => p.name).join(" ")}`)
          .join(" ")
          .toLowerCase();
        
        isSocialLandlord = allText.includes("metropolitan") ||
                          allText.includes("thames valley") ||
                          allText.includes("housing association") ||
                          allText.includes("council") ||
                          allText.includes("social housing") ||
                          extractedFacts.some(f => 
                            f.parties.some(p => 
                              p.name.toLowerCase().includes("metropolitan") ||
                              p.name.toLowerCase().includes("thames valley") ||
                              p.name.toLowerCase().includes("housing association")
                            )
                          );
      }
      
      // Default to true for housing disrepair cases if we can't determine
      // Most housing disrepair cases are social landlords
      if (!isSocialLandlord) {
        isSocialLandlord = true;
      }
      
      // Use deadlines fetched earlier (already populated above)
      
      riskAlertsForPanel = await buildRiskAlerts({
        caseId,
        orgId,
        practiceArea: caseRecord.practice_area as PracticeArea,
        extractedFacts,
        housingMeta: extractedFacts[0]?.housingMeta,
        firstComplaintDate,
        isSocialLandlord,
        limitationInfo,
        deadlines: deadlinesForAlerts,
      });
      
      console.log(`[CasePage] Built ${riskAlertsForPanel.length} risk alerts for case ${caseId}`, {
        isSocialLandlord,
        firstComplaintDate: firstComplaintDate?.toISOString(),
        extractedFactsCount: extractedFacts.length,
        alerts: riskAlertsForPanel.map(a => ({ id: a.id, type: a.type, severity: a.severity, title: a.title })),
      });
    } catch (error) {
      console.error("[CasePage] Failed to build risk alerts:", error);
      // Continue without risk alerts - panel will show empty state
    }
  }

  // Deterministic Awaab alert builder based on Key Issues
  // If any Key Issue mentions Awaab, ensure we have an Awaab RiskAlert
  function ensureAwaabAlertFromKeyIssues(
    existingAlerts: import("@/lib/core/types").RiskAlert[],
    keyIssues: import("@/lib/types/casebrain").KeyIssue[],
    caseId: string
  ): import("@/lib/core/types").RiskAlert[] {
    // If we already have an Awaab alert, return as-is
    if (existingAlerts.some(a => a.type === "awaabs_law")) {
      return existingAlerts;
    }

    // Case-insensitive check for Awaab in Key Issues
    const allowed = ["housing", "liability", "procedure"];
    const awaabIssue = keyIssues.find(issue => {
      const category = (issue.category ?? "").toLowerCase();
      const label = (issue.label ?? "").toLowerCase();
      return allowed.includes(category) && label.includes("awaab");
    });

    if (!awaabIssue) {
      return existingAlerts;
    }

    // Map KeyIssue severity to RiskAlert severity (case-insensitive)
    const keySeverity = (awaabIssue.severity ?? "MEDIUM").toString().toLowerCase();
    let severity: import("@/lib/core/types").RiskSeverity;
    if (keySeverity === "critical") {
      severity = "critical";
    } else if (keySeverity === "high") {
      severity = "high";
    } else {
      severity = "medium";
    }

    // Push new alert to existing array
    existingAlerts.push({
      id: `awaab-from-key-issue-${caseId}`,
      type: "awaabs_law",
      severity,
      status: "outstanding",
      title: "Awaab's Law compliance risk",
      message: awaabIssue.label ?? "Potential Awaab's Law compliance issue identified.",
      recommendedActions: [
        {
          id: "verify-compliance",
          label: "Verify first complaint date and investigation date",
          description: "Check if landlord is social/council (Awaab's Law applies)",
          priority: "urgent",
        },
        {
          id: "document-breaches",
          label: "Document all statutory deadline breaches",
          description: "Record missed 7-day assessment and 28-day repair deadlines",
          priority: "high",
        },
        {
          id: "enforcement-action",
          label: "Consider urgent enforcement action",
          description: "Report to Housing Ombudsman if breach confirmed",
          priority: "high",
        },
      ],
      sourceEvidence: [`key_issue_${awaabIssue.id}`],
      createdAt: new Date().toISOString(),
    });

    console.log("[CasePage] Added Awaab alert from Key Issue:", {
      category: awaabIssue.category,
      label: awaabIssue.label,
      severity,
    });

    return existingAlerts;
  }

  // Convert risk flags for heatmap (include both DB flags and newly generated alerts)
  const riskFlagsForHeatmap: RiskFlag[] = [
    ...(riskFlags ?? []).map((f) => ({
      id: f.id,
      caseId,
      severity: f.severity.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      type: (f.flag_type === "limitation_period" ? "limitation" : f.flag_type) as RiskFlag["type"],
      code: f.flag_type.toUpperCase(),
      title: f.flag_type.replace(/_/g, " "),
      message: f.description,
      source: "risk_detection",
      status: (f.resolved ? "resolved" : "outstanding") as RiskStatus,
      createdAt: f.detected_at,
      resolvedAt: f.resolved_at ?? undefined,
    })),
    // Add risk alerts as risk flags for heatmap
    ...riskAlertsForPanel.map((alert) => ({
      id: alert.id,
      caseId,
      severity: alert.severity.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      type: (alert.type === "awaabs_law" ? "awaabs_law" : alert.type) as RiskFlag["type"],
      code: alert.type.toUpperCase(),
      title: alert.title,
      message: alert.message,
      source: "risk_alerts_engine",
      status: (alert.status === "resolved" ? "resolved" : "outstanding") as RiskFlag["status"],
      createdAt: alert.createdAt ?? new Date().toISOString(),
      resolvedAt: undefined,
    })),
  ];

  // deadlineRiskScore, deadlineSteps, and deadlinesForAlerts already fetched above

  // Compute case heatmap
  const caseHeatmap = computeCaseHeatmap({
    caseId,
    practiceArea: caseRecord.practice_area ?? "general",
    riskFlags: riskFlagsForHeatmap,
    missingEvidence,
    limitationInfo,
    hasTimeline: timeline.length > 0,
    documentCount: documents?.length ?? 0,
    extractedFactsCount: rawKeyIssues.length,
    stage: housingCase?.stage ?? undefined,
    deadlineRiskScore,
  });

  // Guarantee at least one Awaab alert if the Awaab cell in the heatmap is < 100
  if (caseRecord.practice_area === "housing_disrepair") {
    const awaabCell = caseHeatmap.cells.find(
      (c) => c.issue === "AWAAB_RISK"
    );
    const awaabScore = awaabCell?.score ?? 100;
    const awaabReason = awaabCell?.reason ?? "";

    const hasAwaabAlert = riskAlertsForPanel.some(
      (a) => a.type === "awaabs_law"
    );

    if (awaabScore < 100 && !hasAwaabAlert) {
      const severity: import("@/lib/core/types").RiskSeverity =
        awaabScore <= 20 ? "critical" :
        awaabScore <= 40 ? "high" :
        "medium";

      riskAlertsForPanel.push({
        id: `awaab-from-heatmap-${caseId}`,
        type: "awaabs_law",
        severity,
        status: "outstanding",
        title: "Awaab's Law compliance risk",
        message:
          awaabReason ||
          "Potential breach of Awaab's Law based on damp, mould and health conditions affecting a child.",
        recommendedActions: [
          {
            id: "verify-compliance",
            label: "Verify first complaint date and investigation date",
            description: "Check if landlord is social/council (Awaab's Law applies)",
            priority: "urgent",
          },
          {
            id: "document-breaches",
            label: "Document all statutory deadline breaches",
            description: "Record missed 7-day assessment and 28-day repair deadlines",
            priority: "high",
          },
          {
            id: "enforcement-action",
            label: "Consider urgent enforcement action",
            description: "Report to Housing Ombudsman if breach confirmed",
            priority: "high",
          },
        ],
        sourceEvidence: [`awaab_heatmap_${caseId}`],
        createdAt: new Date().toISOString(),
      });

      console.log(`[CasePage] Added Awaab alert from heatmap: score=${awaabScore}, severity=${severity}`);
    }
  }

  // Apply Key Issues fallback after heatmap fallback
  if (caseRecord.practice_area === "housing_disrepair") {
    riskAlertsForPanel = ensureAwaabAlertFromKeyIssues(
      riskAlertsForPanel,
      keyIssues,
      caseId
    );
  }

  // Log final alerts before passing to components
  console.log("[CasePage] Final riskAlertsForPanel", {
    caseId,
    count: riskAlertsForPanel.length,
    byType: riskAlertsForPanel.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      status: a.status,
      title: a.title,
    })),
  });

  // Fetch attendance notes for recency check
  const { data: recentNotes } = await supabase
    .from("case_notes")
    .select("created_at")
    .eq("case_id", caseId)
    .eq("org_id", orgId) // Multi-tenant isolation: ensure notes belong to this org
    .order("created_at", { ascending: false })
    .limit(1);

  const lastNoteDate = recentNotes?.[0]?.created_at;
  const daysSinceUpdate = lastNoteDate
    ? Math.floor((Date.now() - new Date(lastNoteDate).getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  // Calculate next step
  const nextStep = calculateNextStep({
    caseId,
    practiceArea: caseRecord.practice_area ?? "general",
    stage: housingCase?.stage ?? piCase?.stage ?? undefined,
    limitationInfo,
    riskFlags: riskFlagsForHeatmap,
    missingEvidence,
    pendingChasers: [], // TODO: fetch from correspondence table
    hasRecentAttendanceNote: daysSinceUpdate <= 14,
    daysSinceLastUpdate: daysSinceUpdate,
  });

  // deadlineSteps already fetched above

  const allNextSteps = calculateAllNextSteps({
    caseId,
    practiceArea: caseRecord.practice_area ?? "general",
    stage: housingCase?.stage ?? piCase?.stage ?? undefined,
    limitationInfo,
    riskFlags: riskFlagsForHeatmap,
    missingEvidence,
    pendingChasers: [],
    hasRecentAttendanceNote: daysSinceUpdate <= 14,
    daysSinceLastUpdate: daysSinceUpdate,
    deadlineSteps,
  });

  const labsEnabled = process.env.NEXT_PUBLIC_ENABLE_LABS === "true";
  const latestDocument = documents?.[0];
  
  // Use standardized practice area labels
  const PRACTICE_AREA_LABEL_MAP: Record<string, string> = {
    housing_disrepair: "Housing Disrepair",
    personal_injury: "Personal Injury",
    clinical_negligence: "Clinical Negligence",
    family: "Family",
    other_litigation: "Other Litigation",
    // Legacy mappings
    pi: "Personal Injury",
    housing: "Housing Disrepair",
    clin_neg: "Clinical Negligence",
  };
  const practiceAreaLabel = PRACTICE_AREA_LABEL_MAP[caseRecord.practice_area ?? ""] ?? "General";

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr_320px]">
      <aside className="space-y-4">
        <Card title="Case Files">
          <CaseFilesList
            documents={(documents ?? []).map((d) => ({
              id: d.id,
              name: d.name,
              created_at: d.created_at,
            }))}
          />
        </Card>

        <Card
          title="Letters"
          action={
            <Link href={`/cases/${caseId}/letters/new`}>
              <Button size="sm" variant="primary" className="gap-2">
                <ClipboardEdit className="h-4 w-4" />
                Draft Letter
              </Button>
            </Link>
          }
        >
          <ul className="space-y-3">
            {(letters ?? []).map((letter) => (
              <li
                key={letter.id}
                className="rounded-2xl border bg-surface-muted/70 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-accent">
                    Template {letter.template_id}
                  </p>
                  <span className="text-xs text-accent/50">
                    v{letter.version}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-accent/60">
                  {letter.body.slice(0, 120)}…
                </p>
                <Link
                  href={`/cases/${caseId}/letters/${letter.id}`}
                  className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline"
                >
                  View version & diff
                </Link>
              </li>
            ))}
            {!letters?.length && (
              <p className="text-sm text-accent/60">
                No letters drafted yet. Generate a letter using extracted facts.
              </p>
            )}
          </ul>
        </Card>
      </aside>

      <main className="space-y-4">
        <CasePageClient casePracticeArea={caseRecord.practice_area as PracticeArea | null | undefined} />
        
        {/* Case Summary Panel */}
        <CollapsibleSection
          title="Case Summary"
          description="AI-generated solicitor-style case summary"
          defaultOpen={true}
          icon={<FileText className="h-4 w-4 text-blue-400" />}
        >
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <h2 className="text-xl font-bold text-white mb-2">{caseRecord.title ?? "Untitled Case"}</h2>
                <p className="text-sm text-accent/70">
                  {caseRecord.summary ?? "No summary captured yet."}
                </p>
              </div>
            }
          >
            <CaseSummaryPanel
              caseId={caseId}
              caseTitle={caseRecord.title ?? "Untitled Case"}
              practiceArea={practiceAreaLabel}
              summary={caseRecord.summary ?? null}
            />
          </ErrorBoundary>
        </CollapsibleSection>

        {/* Action Bar Card - Export, Archive, etc. */}
        <Card
          title={
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span>Actions</span>
              </div>
              <div className="flex items-center gap-2">
                <CasePageClientWithActions
                  caseId={caseId}
                  caseTitle={caseRecord.title ?? "Untitled Case"}
                  analysisStale={caseRecord.analysis_stale ?? false}
                  latestDelta={null} // Will be fetched client-side if needed
                />
                <CaseOverviewExportButton caseId={caseId} caseTitle={caseRecord.title ?? undefined} />
                <CasePackExportButton caseId={caseId} />
              <CaseArchiveButton caseId={caseId} caseTitle={caseRecord.title} />
              </div>
            </div>
          }
        >
          <div className="space-y-3">
            <div>
              <PracticeAreaSelector
                caseId={caseId}
                currentPracticeArea={(caseRecord.practice_area ?? "other_litigation") as PracticeArea}
              />
            </div>
          {labsEnabled && (
            <>
                <div>
                <ConditionalPortalShare caseId={caseId} />
              </div>
                <div>
                <CaseTypeSelector caseId={caseId} initialValue={caseRecord.practice_area ?? "general"} />
              </div>
            </>
          )}
          </div>
        </Card>

        {/* Key Facts Panel - Case Overview */}
        <CollapsibleSection
          title="Key Facts"
          description="Parties, dates, amounts, and case overview"
          defaultOpen={true}
          icon={<Target className="h-4 w-4 text-blue-400" />}
        >
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Unable to load key facts panel right now. Core case data is still shown above.</p>
              </div>
            }
          >
            <CaseKeyFactsPanel caseId={caseId} />
          </ErrorBoundary>
        </CollapsibleSection>

        {/* Next Step Panel - Priority Action */}
        <CollapsibleSection
          title="Next Steps"
          description="Priority actions and recommended next steps"
          defaultOpen={true}
          icon={<TrendingUp className="h-4 w-4 text-green-400" />}
        >
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Unable to load next steps panel right now.</p>
              </div>
            }
          >
            <NextStepPanel caseId={caseId} nextStep={nextStep} allSteps={allNextSteps} />
          </ErrorBoundary>
        </CollapsibleSection>


        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* Instructions to Counsel - Collapsible */}
        {/* <CollapsibleSection
          title="Instructions to Counsel"
          description="Generate comprehensive instructions to counsel document"
          defaultOpen={false}
          icon={<FileText className="h-4 w-4 text-blue-400" />}
        >
          <ErrorBoundary
            fallback={
              <div className="text-sm text-accent/60 p-4">Unable to load instructions to counsel panel right now.</div>
            }
          >
            <InstructionsToCounselPanel 
            caseId={caseId}
            existingData={{
              timeline: timeline.map(t => ({
                date: t.date,
                label: t.label,
                description: t.description ?? t.label,
              })),
              keyIssues: keyIssues.map(ki => ({
                id: ki.id,
                label: ki.label,
                category: ki.category,
                severity: ki.severity,
              })),
              parties: extractedFacts.flatMap(f => f.parties ?? []),
              documents: (documents ?? []).map(d => ({
                id: d.id,
                name: d.name,
                type: d.type,
              })),
              caseRecord: {
                title: caseRecord.title,
                summary: caseRecord.summary,
                practice_area: caseRecord.practice_area,
              },
              clientName: extractedFacts
                .flatMap(f => f.parties ?? [])
                .find(p => (p.role ?? "").toLowerCase().includes("claimant") || (p.role ?? "").toLowerCase().includes("tenant") || (p.role ?? "").toLowerCase().includes("client"))?.name,
              opponentName: extractedFacts
                .flatMap(f => f.parties ?? [])
                .find(p => (p.role ?? "").toLowerCase().includes("defendant") || (p.role ?? "").toLowerCase().includes("landlord") || (p.role ?? "").toLowerCase().includes("opponent"))?.name,
            }}
          />
          </ErrorBoundary>
        </CollapsibleSection> */}

        {/* Key Issues Panel */}
        {keyIssues.length > 0 && (
          <CollapsibleSection
            title="Key Issues"
            description="Main legal and factual issues in dispute"
            defaultOpen={true}
            icon={<AlertCircle className="h-4 w-4 text-red-400" />}
          >
            <ErrorBoundary
              fallback={
                <div className="p-4">
                  <p className="text-sm text-accent/60">Unable to load key issues panel right now.</p>
                </div>
              }
            >
              <KeyIssuesPanel issues={keyIssues} />
            </ErrorBoundary>
          </CollapsibleSection>
        )}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* In-Case Search */}
        {/* <CollapsibleSection
          title="Search Case"
          description="Search across all case documents and data"
          defaultOpen={false}
          icon={<Search className="h-4 w-4 text-blue-400" />}
        >
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Unable to load search panel right now.</p>
              </div>
            }
          >
            <InCaseSearchBox caseId={caseId} />
          </ErrorBoundary>
        </CollapsibleSection> */}

        {/* Missing Evidence Panel */}
        <CollapsibleSection
          title="Missing Evidence"
          description="Evidence gaps and items to request"
          defaultOpen={false}
          icon={<ListChecks className="h-4 w-4 text-amber-400" />}
        >
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Unable to load missing evidence panel right now.</p>
              </div>
            }
          >
            {/* Missing evidence now sourced from case_analysis_versions - items prop is optional */}
            <MissingEvidencePanel caseId={caseId} />
          </ErrorBoundary>
        </CollapsibleSection>

        {/* TODO: re-enable after wiring to versions / new APIs */}
        {/* Evidence Tracker Section - Commented out as it's not wired to case_analysis_versions yet */}
        {/* <CollapsibleSection
          title="Evidence Tracker"
          description="Track evidence items, status, and chase dates"
          defaultOpen={true}
          icon={<ListChecks className="h-4 w-4 text-cyan-400" />}
        >
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Unable to load evidence tracker right now.</p>
              </div>
            }
          >
            <div className="p-4 text-sm text-accent/60">Evidence tracker temporarily unavailable.</div>
          </ErrorBoundary>
        </CollapsibleSection> */}

        {/* Analysis Delta Panel - Show if new version created */}
        {caseRecord.latest_analysis_version && caseRecord.latest_analysis_version > 1 && (
          <ErrorBoundary fallback={null}>
            <AnalysisDeltaPanelWrapper caseId={caseId} />
          </ErrorBoundary>
        )}

        {/* TODO: re-enable after wiring to versions / new APIs */}
        {/* Audit Trail Section - Commented out as it's not wired yet */}
        {/* <CollapsibleSection
          title="Audit Trail"
          description="Complete history of case events and changes"
          defaultOpen={false}
          icon={<History className="h-4 w-4 text-purple-400" />}
        >
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Unable to load audit trail right now.</p>
              </div>
            }
          >
            <div className="p-4 text-sm text-accent/60">Audit trail temporarily unavailable.</div>
          </ErrorBoundary>
        </CollapsibleSection> */}

        {/* Documents Section - Consolidated */}
        <CollapsibleSection
          title="Documents & Bundle"
          description="Document map and bundle navigator"
          defaultOpen={false}
          icon={<FileText className="h-4 w-4 text-purple-400" />}
          action={
            <Link href={`/upload?caseId=${caseId}`}>
              <Button size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Evidence
              </Button>
            </Link>
          }
        >
          <div className="space-y-4">
            <ErrorBoundary
              fallback={
                <div className="text-sm text-accent/60 p-4">Unable to load document map right now.</div>
              }
            >
              <DocumentMapPanel
                documents={(documents ?? []).map((d) => ({
                  id: d.id,
                  name: d.name,
                  type: d.type ?? undefined,
                  created_at: d.created_at,
                }))}
                practiceArea={caseRecord.practice_area}
              />
            </ErrorBoundary>

            <ErrorBoundary
              fallback={
                <div className="text-sm text-accent/60 p-4">Unable to load bundle navigator right now.</div>
              }
            >
              <BundlePhaseAPanel caseId={caseId} />
            </ErrorBoundary>
          </div>
        </CollapsibleSection>

        {isHousingCase && housingCase ? (
          <>
            <CollapsibleSection
              title="Housing Case Overview"
              description="Case summary, defects, and key housing information"
              defaultOpen={true}
              icon={<Home className="h-4 w-4 text-blue-400" />}
            >
              <ErrorBoundary
                fallback={
                  <div className="p-4">
                    <p className="text-sm text-accent/60">Unable to load housing case overview right now.</p>
                  </div>
                }
              >
            <HousingCaseOverview
              caseId={caseId}
              housingCase={housingCase}
              defects={housingDefects}
            />
              </ErrorBoundary>
            </CollapsibleSection>
            {/* Aggressive Defense Panel - Top Priority */}
            <CollapsibleSection
              title="Aggressive Defense Analysis"
              description="Find every possible angle to win this case - tactical defense strategies"
              defaultOpen={true}
              icon={<Target className="h-4 w-4 text-red-400" />}
            >
              <ErrorBoundary
                fallback={
                  <div className="p-4">
                    <p className="text-sm text-accent/60">Aggressive defense analysis unavailable right now.</p>
                  </div>
                }
              >
                <AggressiveDefensePanel caseId={caseId} />
              </ErrorBoundary>
            </CollapsibleSection>

            {/* Consolidated Housing Analysis Section */}
            <ErrorBoundary
              fallback={
                <div className="p-4">
                  <p className="text-sm text-accent/60">Unable to load housing analysis section right now.</p>
                </div>
              }
            >
              <HousingAnalysisSection caseId={caseId} defaultOpen={true} />
            </ErrorBoundary>
            {/* Other housing panels - keep but make collapsible */}
            <CollapsibleSection
              title="Bundle Checker"
              description="Verify bundle completeness and compliance"
              defaultOpen={false}
              icon={<Shield className="h-4 w-4 text-green-400" />}
            >
              <ErrorBoundary
                fallback={
                  <div className="text-sm text-accent/60 p-4">Unable to load bundle checker right now.</div>
                }
              >
            <BundleCheckerPanel caseId={caseId} />
              </ErrorBoundary>
            </CollapsibleSection>
            <CollapsibleSection
              title="Housing Hazards"
              description="Category 1 and 2 hazard assessment"
              defaultOpen={false}
              icon={<AlertCircle className="h-4 w-4 text-red-400" />}
            >
              <ErrorBoundary
                fallback={
                  <div className="text-sm text-accent/60 p-4">Unable to load hazard panel right now.</div>
                }
              >
                <HousingHazardPanel
                  caseTitle={caseRecord.title ?? ""}
                  documents={(documents ?? []).map((d) => ({
                    name: d.name,
                    type: d.type ?? undefined,
                  }))}
                  landlordType={housingCase?.landlord_type as "social" | "private" | "unknown" | undefined}
                  firstComplaintDate={housingCase?.first_report_date ?? undefined}
                />
              </ErrorBoundary>
            </CollapsibleSection>
            <CollapsibleSection
              title="Housing Compliance & Tools"
              description="Supervision pack, compliance checks, deadline tracker, timeline builder, schedule of disrepair"
              defaultOpen={false}
              icon={<FileText className="h-4 w-4 text-blue-400" />}
            >
              <div className="space-y-4">
            <SupervisionPackPanel caseId={caseId} />
            <HousingCompliancePanel
              housingCase={housingCase}
              complianceChecks={complianceChecks}
            />
            <HousingDeadlineTracker caseId={caseId} />
            <HousingTimelineBuilder caseId={caseId} />
            <ScheduleOfDisrepairPanel caseId={caseId} />
              </div>
            </CollapsibleSection>
          </>
        ) : null}

        {isPiCase && piCase ? (
          <>
            {/* Aggressive Defense Panel - Top Priority */}
            <CollapsibleSection
              title="Aggressive Defense Analysis"
              description="Find every possible angle to win this case - tactical defense strategies"
              defaultOpen={true}
              icon={<Target className="h-4 w-4 text-red-400" />}
            >
              <ErrorBoundary
                fallback={
                  <div className="p-4">
                    <p className="text-sm text-accent/60">Aggressive defense analysis unavailable right now.</p>
                  </div>
                }
              >
                <PiAggressiveDefensePanel caseId={caseId} />
              </ErrorBoundary>
            </CollapsibleSection>

            {labsEnabled && (
              <>
                <CollapsibleSection
                  title="PI Case Overview"
                  description="Case summary and key PI information"
                  defaultOpen={true}
                  icon={<FileText className="h-4 w-4 text-blue-400" />}
                >
                  <PiCaseOverview caseId={caseId} caseType={caseCaseType(caseRecord.practice_area)} piCase={piCase} />
                </CollapsibleSection>
                <CollapsibleSection
                  title="Letter Preview"
                  description="Preview and generate case letters"
                  defaultOpen={false}
                  icon={<Mail className="h-4 w-4 text-green-400" />}
                >
                  <PiLetterPreview
                    caseId={caseId}
                    caseTitle={caseRecord.title}
                    practiceArea={caseRecord.practice_area ?? "general"}
                  />
                </CollapsibleSection>
                <CollapsibleSection
                  title="OIC & MedCo"
                  description="OIC portal and MedCo compliance"
                  defaultOpen={false}
                  icon={<Shield className="h-4 w-4 text-purple-400" />}
                >
                  <OicMedcoPanel caseId={caseId} piCase={piCase} />
                </CollapsibleSection>
              </>
            )}
            <ErrorBoundary
              fallback={
                <div className="p-4">
                  <p className="text-sm text-accent/60">Unable to load PI case details right now.</p>
                </div>
              }
            >
              <PICaseDetailsSection
                caseId={caseId}
                reports={piMedicalReports}
                offers={piOffers}
                hearings={piHearings}
                disbursements={piDisbursements}
                defaultOpen={true}
              />
            </ErrorBoundary>
          </>
        ) : null}

        {/* Phase 3.1: Tactical Command Center (All Practice Areas) */}
        <CollapsibleSection
          title="Tactical Command Center"
          description="THE ANGLE. THE MOVE. THE BACKUP. - One-page tactical dashboard"
          defaultOpen={true}
          icon={<Target className="h-4 w-4 text-primary" />}
        >
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Tactical command center temporarily unavailable.</p>
              </div>
            }
          >
            <TacticalCommandCenter caseId={caseId} />
          </ErrorBoundary>
        </CollapsibleSection>

        {/* Phase 3.1: Next Move Generator (All Practice Areas) */}
        <CollapsibleSection
          title="Next Move Generator"
          description="What do we do NEXT? - Immediate action focus"
          defaultOpen={false}
          icon={<Play className="h-4 w-4 text-green-400" />}
        >
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Next move generator temporarily unavailable.</p>
              </div>
            }
          >
            <NextMovePanel caseId={caseId} />
          </ErrorBoundary>
        </CollapsibleSection>

        {/* Criminal Case View - Completely Different Layout */}
        {isCriminalCase ? (
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Unable to load criminal case view right now.</p>
              </div>
            }
          >
            <CriminalCaseView caseId={caseId} />
          </ErrorBoundary>
        ) : null}

        {/* Family Law Aggressive Defense */}
        {isFamilyCase ? (
          <CollapsibleSection
            title="Aggressive Defense Analysis"
            description="Find every possible angle to win this case - tactical defense strategies"
            defaultOpen={true}
            icon={<Target className="h-4 w-4 text-red-400" />}
          >
            <ErrorBoundary
              fallback={
                <div className="p-4">
                  <p className="text-sm text-accent/60">Aggressive defense analysis unavailable right now.</p>
                </div>
              }
            >
              <FamilyAggressiveDefensePanel caseId={caseId} />
            </ErrorBoundary>
          </CollapsibleSection>
        ) : null}

        {/* New Evidence Banner - Shows when new documents added */}
        <NewEvidenceBanner 
          caseId={caseId} 
        />

        {/* Evidence & Strategy Section - CN only */}
        {caseRecord.practice_area === "clinical_negligence" && (
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Evidence & Strategy temporarily unavailable.</p>
              </div>
            }
          >
            <div data-evidence-strategy-header>
              <EvidenceStrategyHeader caseId={caseId} />
            </div>
          </ErrorBoundary>
        )}

        {/* Strategic Intelligence Section */}
        {process.env.NEXT_PUBLIC_ENABLE_STRATEGIC_INTELLIGENCE !== "false" && (
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Strategic Intelligence temporarily unavailable.</p>
              </div>
            }
          >
            <StrategicIntelligenceSection caseId={caseId} practiceArea={caseRecord.practice_area} />
          </ErrorBoundary>
        )}

        {/* Phase 2: Tactical Advantage Panels (All Practice Areas) */}
        <CollapsibleSection
          title="Witness Analysis"
          description="Credibility attacks and cross-examination questions for each witness"
          defaultOpen={false}
          icon={<Target className="h-4 w-4 text-red-400" />}
        >
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Witness analysis temporarily unavailable.</p>
              </div>
            }
          >
            <WitnessAnalysisPanel caseId={caseId} />
          </ErrorBoundary>
        </CollapsibleSection>

        <CollapsibleSection
          title="Timeline Exploiter"
          description="Find gaps, inconsistencies, and suspicious timing in the case timeline"
          defaultOpen={false}
          icon={<Clock className="h-4 w-4 text-orange-400" />}
        >
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Timeline exploiter temporarily unavailable.</p>
              </div>
            }
          >
            <TimelineExploiterPanel caseId={caseId} />
          </ErrorBoundary>
        </CollapsibleSection>

        <CollapsibleSection
          title="Precedent Matcher"
          description="Find relevant case law that matches your case facts"
          defaultOpen={false}
          icon={<BookOpen className="h-4 w-4 text-blue-400" />}
        >
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Precedent matcher temporarily unavailable.</p>
              </div>
            }
          >
            <PrecedentsPanel caseId={caseId} />
          </ErrorBoundary>
        </CollapsibleSection>

        {/* Phase 2.5: Nuclear Options (All Practice Areas) */}
        <CollapsibleSection
          title="Nuclear Options"
          description="Extreme tactics for desperate cases - use with caution"
          defaultOpen={false}
          icon={<Bomb className="h-4 w-4 text-red-400" />}
        >
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Nuclear options temporarily unavailable.</p>
              </div>
            }
          >
            <NuclearOptionsPanel caseId={caseId} />
          </ErrorBoundary>
        </CollapsibleSection>

        <CollapsibleSection
          title="Case Destroyer"
          description="Systematically destroy every element of the opponent's case"
          defaultOpen={false}
          icon={<Skull className="h-4 w-4 text-red-400" />}
        >
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Case destroyer temporarily unavailable.</p>
              </div>
            }
          >
            <CaseDestroyerPanel caseId={caseId} />
          </ErrorBoundary>
        </CollapsibleSection>

        <CollapsibleSection
          title="Chain Reaction Exploiter"
          description="Find how one weakness triggers multiple failures"
          defaultOpen={false}
          icon={<Zap className="h-4 w-4 text-yellow-400" />}
        >
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Chain reaction exploiter temporarily unavailable.</p>
              </div>
            }
          >
            <ChainReactionPanel caseId={caseId} />
          </ErrorBoundary>
        </CollapsibleSection>

        <CollapsibleSection
          title="Technicality Hunter"
          description="Find every legal technicality that could win"
          defaultOpen={false}
          icon={<Search className="h-4 w-4 text-orange-400" />}
        >
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Technicality hunter temporarily unavailable.</p>
              </div>
            }
          >
            <TechnicalitiesPanel caseId={caseId} />
          </ErrorBoundary>
        </CollapsibleSection>

        <CollapsibleSection
          title="Prosecution Trap Setter"
          description="Questions and arguments that trap opponents into admissions"
          defaultOpen={false}
          icon={<MousePointerClick className="h-4 w-4 text-purple-400" />}
        >
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Prosecution traps temporarily unavailable.</p>
              </div>
            }
          >
            <ProsecutionTrapsPanel caseId={caseId} />
          </ErrorBoundary>
        </CollapsibleSection>

        <CollapsibleSection
          title="Multi-Angle Devastation"
          description="Combine multiple weak points into one devastating attack"
          defaultOpen={false}
          icon={<Target className="h-4 w-4 text-red-400" />}
        >
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">Multi-angle devastation temporarily unavailable.</p>
              </div>
            }
          >
            <MultiAngleDevastationPanel caseId={caseId} />
          </ErrorBoundary>
        </CollapsibleSection>

        {/* What Changed Panel - CN only */}
        {caseRecord.practice_area === "clinical_negligence" && (
          <ErrorBoundary
            fallback={
              <div className="p-4">
                <p className="text-sm text-accent/60">What Changed panel temporarily unavailable.</p>
              </div>
            }
          >
            <WhatChangedPanel caseId={caseId} />
          </ErrorBoundary>
        )}

        {/* Case Pack PDF Export Panel */}
        <CollapsibleSection
          title="Export Case Pack"
          description="Generate comprehensive PDF case pack"
          defaultOpen={false}
          icon={<FolderOpen className="h-4 w-4 text-purple-400" />}
        >
          <CasePackExportPanel caseId={caseId} />
        </CollapsibleSection>
      </main>

      <aside className="space-y-4">
        {isHousingCase && housingCase ? (
          <HousingQuantumCalculator
            caseId={caseId}
            housingCase={housingCase}
            defects={housingDefects}
            hasMedicalEvidence={
              (documents ?? []).some(
                (d) =>
                  d.name.toLowerCase().includes("medical") ||
                  d.name.toLowerCase().includes("gp") ||
                  d.name.toLowerCase().includes("doctor"),
              )
            }
          />
        ) : null}
        {labsEnabled && isPiCase && piCase ? (
          <PiValuationHelper piCase={piCase} disbursements={piDisbursements} />
        ) : null}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* Case Health Heatmap */}
        {/* <ErrorBoundary
          fallback={
            <Card className="bg-surface/50 border-white/10 backdrop-blur-sm">
              <div className="p-4">
                <p className="text-sm text-accent/60">Unable to load case health heatmap right now.</p>
                    </div>
        </Card>
          }
        >
          <CaseHeatmapPanel heatmap={caseHeatmap} />
        </ErrorBoundary> */}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* Case Notes */}
        {/* <ErrorBoundary
          fallback={
            <Card title="Case Notes">
              <p className="text-sm text-accent/60">Unable to load case notes right now.</p>
            </Card>
          }
        >
          <CaseNotesPanel caseId={caseId} />
        </ErrorBoundary> */}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* Supervisor Review */}
        {/* <ErrorBoundary
          fallback={
            <Card title="Supervisor Review">
              <p className="text-sm text-accent/60">Unable to load supervisor review right now.</p>
        </Card>
          }
        >
          <SupervisorReviewPanel caseId={caseId} caseName={caseRecord.title ?? undefined} />
        </ErrorBoundary> */}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* Deadline Management */}
        {/* <ErrorBoundary
          fallback={
            <Card title="Deadlines">
              <p className="text-sm text-accent/60">Failed to load deadlines</p>
            </Card>
          }
        >
          <div className="space-y-4">
            <DeadlineManagementPanel caseId={caseId} />
            <ErrorBoundary fallback={<div className="text-sm text-accent/60 p-4">Calendar unavailable</div>}>
              <DeadlineCalendarWrapper caseId={caseId} />
            </ErrorBoundary>
          </div>
        </ErrorBoundary> */}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* Time Tracker */}
        {/* <ErrorBoundary fallback={<div className="text-sm text-accent/60 p-4">Time tracker unavailable</div>}>
          <TimeTracker caseId={caseId} />
        </ErrorBoundary> */}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* Billing & Invoices */}
        {/* <ErrorBoundary fallback={<div className="text-sm text-accent/60 p-4">Billing unavailable</div>}>
          <InvoiceList caseId={caseId} />
        </ErrorBoundary> */}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* Email Integration */}
        {/* <ErrorBoundary fallback={<div className="text-sm text-accent/60 p-4">Email unavailable</div>}>
          <CaseEmailsPanel caseId={caseId} />
        </ErrorBoundary> */}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* Communication History */}
        {/* <ErrorBoundary fallback={<div className="text-sm text-accent/60 p-4">Communication history unavailable</div>}>
          <CommunicationHistoryPanel caseId={caseId} />
        </ErrorBoundary> */}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* SMS/WhatsApp */}
        {/* <ErrorBoundary fallback={<div className="text-sm text-accent/60 p-4">SMS/WhatsApp unavailable</div>}>
          <SMSPanel caseId={caseId} />
        </ErrorBoundary> */}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* E-Signature */}
        {/* <ErrorBoundary fallback={<div className="text-sm text-accent/60 p-4">E-signature unavailable</div>}>
          <ESignaturePanel caseId={caseId} />
        </ErrorBoundary> */}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* Calendar Events */}
        {/* <ErrorBoundary fallback={<div className="text-sm text-accent/60 p-4">Calendar unavailable</div>}>
          <CalendarEventsPanel caseId={caseId} />
        </ErrorBoundary> */}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* Document Version Control */}
        {/* {documents && documents.length > 0 && (
          <ErrorBoundary fallback={<div className="text-sm text-accent/60 p-4">Document versions unavailable</div>}>
            <DocumentVersionsPanel documentId={documents[0].id} />
          </ErrorBoundary>
        )} */}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* Custom Reports */}
        {/* <ErrorBoundary fallback={<div className="text-sm text-accent/60 p-4">Reports unavailable</div>}>
          <CustomReportsPanel caseId={caseId} />
        </ErrorBoundary> */}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* Trust Accounting (UK-specific) */}
        {/* <ErrorBoundary fallback={<div className="text-sm text-accent/60 p-4">Trust accounting unavailable</div>}>
          <ClientMoneyPanel caseId={caseId} />
        </ErrorBoundary> */}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* Case Profitability */}
        {/* <ErrorBoundary fallback={<div className="text-sm text-accent/60 p-4">Profitability unavailable</div>}>
          <ProfitabilityCard caseId={caseId} />
        </ErrorBoundary> */}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* Settlement Calculator */}
        {/* <ErrorBoundary fallback={<div className="text-sm text-accent/60 p-4">Settlement calculator unavailable</div>}>
          <SettlementCalculatorPanel caseId={caseId} />
        </ErrorBoundary> */}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* Client Timeline */}
        {/* <ErrorBoundary fallback={<div className="text-sm text-accent/60 p-4">Client timeline unavailable</div>}>
          <ClientTimelinePanel caseId={caseId} currentStage={piCase?.stage || housingCase?.stage} />
        </ErrorBoundary> */}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* Pre-Action Protocol Checklist */}
        {/* <ErrorBoundary fallback={<div className="text-sm text-accent/60 p-4">Protocol checklist unavailable</div>}>
          <PreActionProtocolChecklist 
            caseId={caseId} 
            practiceArea={caseRecord.practice_area ?? "other_litigation"} 
          />
        </ErrorBoundary> */}

        {/* TODO: hidden for ship – re-enable when data + integrations are production-ready */}
        {/* Risk Alerts - Using the proper RiskAlertsPanel component (removed duplicate card) */}
        {/* <ErrorBoundary
          fallback={
            <Card title="Risk Alerts">
              <p className="text-sm text-accent/60">Unable to load risk alerts right now.</p>
        </Card>
          }
        >
          {(() => {
            console.log("[CasePage] Rendering RiskAlertsPanel with:", {
              count: riskAlertsForPanel.length,
              alerts: riskAlertsForPanel.map(a => ({
                id: a.id,
                type: a.type,
                severity: a.severity,
                status: a.status ?? "missing",
                title: a.title,
                message: a.message?.substring(0, 50),
              })),
            });
            return <RiskAlertsPanel caseId={caseId} riskAlerts={riskAlertsForPanel} />;
          })()}
        </ErrorBoundary> */}
      </aside>
    </div>
  );
}

function KeyFactsPanel({
  documents,
}: {
  documents: Array<{
    id: string;
    name: string;
    extracted_json: unknown;
  }>;
}) {
  const firstExtraction = documents[0]?.extracted_json as
    | ExtractedCaseFacts
    | null
    | undefined;

  return (
    <Card
      title="Key Facts"
      description="Entities and amounts extracted from uploaded documents."
        >
      {firstExtraction ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-primary/10 bg-surface-muted/80 p-4">
            <p className="text-xs uppercase tracking-wide text-accent/50">
              Parties
            </p>
            <ul className="mt-3 space-y-2 text-sm text-accent/70">
              {firstExtraction.parties.length ? (
                firstExtraction.parties.map((party) => (
                  <li key={`${party.role}-${party.name}`}>
                    <span className="font-semibold text-accent">
                      {party.name}
                    </span>{" "}
                    — {party.role}
                  </li>
                ))
              ) : (
                <li className="text-accent/50">No parties extracted yet.</li>
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-surface-muted/80 p-4">
            <p className="text-xs uppercase tracking-wide text-accent/50">
              Key dates
            </p>
            <ul className="mt-3 space-y-2 text-sm text-accent/70">
              {firstExtraction.dates.length ? (
                firstExtraction.dates.map((date) => (
                  <li key={date.isoDate}>
                    <span className="font-semibold text-accent">
                      {date.label}
                    </span>
                    : {new Date(date.isoDate).toLocaleDateString("en-GB")}
                  </li>
                ))
              ) : (
                <li className="text-accent/50">No dates extracted yet.</li>
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-surface-muted/80 p-4">
            <p className="text-xs uppercase tracking-wide text-accent/50">
              Amounts / claim value
            </p>
            <ul className="mt-3 space-y-2 text-sm text-accent/70">
              {firstExtraction.amounts.length ? (
                firstExtraction.amounts.map((amount) => (
                  <li key={amount.label}>
                    {amount.label}:{" "}
                    <span className="font-semibold text-accent">
                      {new Intl.NumberFormat("en-GB", {
                        style: "currency",
                        currency: amount.currency,
                      }).format(amount.value)}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-accent/50">No monetary amounts extracted yet.</li>
              )}
            </ul>
          </div>
        </div>
      ) : (
        <p className="text-sm text-accent/60">
          Upload a document to populate key facts.
        </p>
      )}
    </Card>
  );
}

function caseCaseType(practiceArea: string | null | undefined) {
  return practiceArea === "clinical_negligence" ? "clinical_negligence" : "pi";
}

