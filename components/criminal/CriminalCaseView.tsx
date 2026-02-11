"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { FoldSection } from "@/components/ui/fold-section";
// Legacy panels - only used in collapsed "Additional Tools" section
import { PACEComplianceChecker } from "./PACEComplianceChecker";
import { CourtHearingsPanel } from "./CourtHearingsPanel";
import { BailTracker } from "./BailTracker";
import { ClientAdvicePanel } from "./ClientAdvicePanel";
import { BailApplicationPanel } from "./BailApplicationPanel";
import { SentencingMitigationPanel } from "./SentencingMitigationPanel";
import { CaseFightPlan } from "./CaseFightPlan";
import { CasePhaseSelector, type CasePhase } from "./CasePhaseSelector";
import { StrategyCommitmentPanel, type StrategyCommitment } from "./StrategyCommitmentPanel";
import { Phase2StrategyPlanPanel } from "./Phase2StrategyPlanPanel";
import { AnalysisGateBanner, type AnalysisGateBannerProps } from "@/components/AnalysisGateBanner";
import { Scale, Shield, Loader2, FileText, Target, AlertCircle } from "lucide-react";
// Phase 2 components
import { buildCaseSnapshot, type CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import { CaseStatusStrip } from "./CaseStatusStrip";
import { CriminalCaseAtAGlanceBar } from "./CriminalCaseAtAGlanceBar";
import { CaseEvidenceColumn } from "./CaseEvidenceColumn";
import { CaseStrategyColumn } from "./CaseStrategyColumn";
import { EvidenceSelectorModal } from "@/components/cases/EvidenceSelectorModal";
import { AddEvidenceModal } from "./AddEvidenceModal";
import { CaseSummaryPanel } from "@/components/cases/CaseSummaryPanel";
import { CaseKeyFactsPanel } from "@/components/cases/KeyFactsPanel";
import { ChargesPanel } from "./ChargesPanel";
import { RecordPositionModal } from "./RecordPositionModal";
import { BackToTop } from "@/components/ui/back-to-top";

type CriminalCaseViewProps = {
  caseId: string;
};

export function CriminalCaseView({ caseId }: CriminalCaseViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Hydration guard: prevent ErrorBoundary fallback from showing during initial mount
  const [mounted, setMounted] = useState(false);
  
  // Phase 2: Snapshot state
  const [snapshot, setSnapshot] = useState<CaseSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [showAddDocuments, setShowAddDocuments] = useState(false); // For analysis document selection
  const [showAddEvidenceUpload, setShowAddEvidenceUpload] = useState(false); // For uploading new evidence

  const [gateBanner, setGateBanner] = useState<{
    banner: AnalysisGateBannerProps["banner"];
    diagnostics?: AnalysisGateBannerProps["diagnostics"];
  } | null>(null);
  const [isDisclosureFirstMode, setIsDisclosureFirstMode] = useState<boolean>(false);
  const [currentPhase, setCurrentPhase] = useState<CasePhase>(1);
  const [committedStrategy, setCommittedStrategy] = useState<StrategyCommitment | null>(null);
  const [isStrategyCommitted, setIsStrategyCommitted] = useState(false);
  const [hasSavedPosition, setHasSavedPosition] = useState(false);
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [savedPosition, setSavedPosition] = useState<{ id: string; position_text: string; created_at: string; phase: number } | null>(null);
  const [panelData, setPanelData] = useState<{
    bail: { hasData: boolean };
    sentencing: { hasData: boolean };
    hearings: { hasData: boolean };
    pace: { hasData: boolean };
  }>({
    bail: { hasData: false },
    sentencing: { hasData: false },
    hearings: { hasData: false },
    pace: { hasData: false },
  });
  /** From strategy-analysis API (StrategyCommitmentPanel reports when mounted). Used to gate phase selector. */
  const [effectiveProceduralSafety, setEffectiveProceduralSafety] = useState<{ status: string; explanation?: string } | null>(null);
  /** For Case Readiness Gate: client instructions record present */
  const [hasClientInstructions, setHasClientInstructions] = useState(false);

  // Mark as mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch client instructions for readiness gate
  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    fetch(`/api/criminal/${caseId}/client-instructions`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.ok) setHasClientInstructions(!!data.data);
      })
      .catch(() => { if (!cancelled) setHasClientInstructions(false); });
    return () => { cancelled = true; };
  }, [caseId]);

  // Phase 2: Build snapshot on mount
  useEffect(() => {
    async function loadSnapshot() {
      setSnapshotLoading(true);
      setSnapshotError(null);
      try {
        const snap = await buildCaseSnapshot(caseId);
        setSnapshot(snap);
        // Update committed strategy from snapshot (strategy commitment, not position)
        if (snap.decisionLog.currentPosition) {
          setIsStrategyCommitted(true);
          setCommittedStrategy({
            primary: snap.decisionLog.currentPosition.position as any,
            secondary: snap.decisionLog.history
              .filter(h => h.position !== snap.decisionLog.currentPosition?.position)
              .map(h => h.position as any),
          });
        } else {
          setIsStrategyCommitted(false);
        }
      } catch (error) {
        console.error("[CriminalCaseView] Failed to load snapshot:", error);
        setSnapshotError(error instanceof Error ? error.message : "Failed to load case data");
        // Fail-safe: still allow page to render
        setSnapshot(null);
      } finally {
        setSnapshotLoading(false);
      }
    }
    loadSnapshot();
  }, [caseId]);

  // Canonical phase rule: Phase 2 when a recorded defence position exists (not strategy commitment).
  // On mount/refresh, fetch position and set phase so Phase 2 persists after refresh.
  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    async function loadPosition() {
      try {
        const response = await fetch(`/api/criminal/${caseId}/position`, { credentials: "include" });
        if (cancelled) return;
        if (response.ok) {
          const data = await response.json();
          if (data.ok && (data.data || data.position)) {
            setSavedPosition(data.data || data.position);
            setHasSavedPosition(true);
            setCurrentPhase(2);
          } else {
            setSavedPosition(null);
            setHasSavedPosition(false);
            setCurrentPhase(1);
          }
        } else {
          setSavedPosition(null);
          setHasSavedPosition(false);
          setCurrentPhase(1);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("[CriminalCaseView] Failed to load position:", error);
          setSavedPosition(null);
          setHasSavedPosition(false);
          setCurrentPhase(1);
        }
      }
    }
    loadPosition();
    return () => { cancelled = true; };
  }, [caseId]);

  // Check if analysis is gated and determine mode (using snapshot data when available)
  useEffect(() => {
    if (!snapshot) return; // Wait for snapshot
    
    // RULE: Only show "Insufficient text extracted" banner if:
    // 1. Analysis mode is preview/none AND
    // 2. Strategy outputs CANNOT be shown (avoid contradictory states)
    const shouldShowGateBanner = 
      (snapshot.analysis.mode === "preview" || snapshot.analysis.mode === "none") &&
      !snapshot.analysis.canShowStrategyOutputs;
    
    if (shouldShowGateBanner) {
      // Use thin pack message if preview is available
      const message = snapshot.analysis.canShowStrategyPreview && !snapshot.analysis.canShowStrategyFull
        ? "Thin pack: limited outputs. Add documents for full strategy routes."
        : "Not enough extractable text to generate reliable analysis. Upload text-based PDFs or run OCR, then re-analyse.";
      
            setGateBanner({
        banner: {
                severity: "warning",
                title: "Insufficient text extracted",
          message,
              },
            });
            setIsDisclosureFirstMode(true);
          } else {
            setGateBanner(null);
      // Check if mode is DISCLOSURE-FIRST from strategy data (for UI hints only; phase is from position)
      const primary = snapshot.strategy.primary;
      const mode = primary === "fight_charge" && snapshot.strategy.hasRenderableData 
        ? "OTHER" 
        : "DISCLOSURE-FIRST";
            setIsDisclosureFirstMode(mode === "DISCLOSURE-FIRST");
      // Phase is NOT set from snapshot; it is set from GET /position on mount and onPositionChange.
    }
  }, [snapshot]);

  // Handle query param actions (idempotent - only runs once per param)
  useEffect(() => {
    const action = searchParams.get("action");
    if (!action) return;

    // Handle reanalyse action
    if (action === "reanalyse") {
      // Clear param immediately to prevent re-trigger on refresh
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete("action");
      router.replace(`/cases/${caseId}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ""}`, { scroll: false });

      // Trigger reanalyse
      async function triggerReanalyse() {
        try {
          console.log(`[CriminalCaseView] Starting re-run analysis for case ${caseId} (query param)`);
          const res = await fetch(`/api/cases/${caseId}/analysis/rerun`, {
            method: "POST",
            credentials: "include",
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: "Failed to re-run analysis" }));
            const errorMessage = errorData.error || `Failed to re-run analysis (${res.status})`;
            console.error(`[CriminalCaseView] Re-run failed: ${res.status}`, errorData);
            throw new Error(errorMessage);
          }

          const data = await res.json();
          console.log(`[CriminalCaseView] Re-run successful: version ${data.version_number}`, data);
          
          // Wait a moment for the version to be fully written, then refresh
          setTimeout(() => {
            router.refresh();
            // Also trigger client-side refetch of dependent endpoints
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("analysis-rerun-complete", { detail: { versionNumber: data.version_number } }));
            }
          }, 750);
        } catch (error) {
          console.error(`[CriminalCaseView] Failed to re-run analysis for case ${caseId}:`, error);
          // Show user-friendly error
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("analysis-rerun-error", { 
              detail: { error: error instanceof Error ? error.message : "Failed to re-run analysis" } 
            }));
          }
        }
      }
      triggerReanalyse();
      return;
    }

    // Handle add-documents action
    if (action === "add-documents") {
      // Clear param immediately to prevent re-trigger on refresh
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete("action");
      router.replace(`/cases/${caseId}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ""}`, { scroll: false });

      // Open add documents UI
      setShowAddDocuments(true);
      return;
    }
  }, [searchParams, caseId, router]);
  
  // Check panel data (for phase gating only - not for rendering)
  useEffect(() => {
    async function checkPanelData() {
      // Minimal check for phase gating - panels themselves will fetch their own data
      try {
        const [bailRes, sentencingRes, hearingsRes, paceRes] = await Promise.all([
          fetch(`/api/criminal/${caseId}/bail-application`).catch(() => null),
          fetch(`/api/criminal/${caseId}/sentencing-mitigation`).catch(() => null),
          fetch(`/api/criminal/${caseId}/hearings`).catch(() => null),
          fetch(`/api/criminal/${caseId}/pace`).catch(() => null),
        ]);
        
        const bailData = bailRes?.ok ? await bailRes.json().catch(() => null) : null;
        const sentencingData = sentencingRes?.ok ? await sentencingRes.json().catch(() => null) : null;
        const hearingsData = hearingsRes?.ok ? await hearingsRes.json().catch(() => null) : null;
        const paceData = paceRes?.ok ? await paceRes.json().catch(() => null) : null;
        
        setPanelData({
          bail: { hasData: !!(bailData?.data || (bailData?.grounds?.length ?? 0) >= 1) },
          sentencing: { hasData: !!(sentencingData?.data || (sentencingData?.personalMitigation?.length ?? 0) >= 1) },
          hearings: { hasData: !!((hearingsData?.hearings?.length ?? 0) >= 1) },
          pace: { hasData: !!(paceData?.data || paceData?.paceStatus) },
        });
      } catch {
        // Silently fail - panel data check is optional
      }
    }
    
    checkPanelData();
  }, [caseId]);

  // Phase 1: Disclosure & Readiness (default when DISCLOSURE-FIRST)
  // Phase 2: Positioning & Options
  // Phase 3: Sentencing & Outcome

  const showBailTools = currentPhase >= 2 || panelData.bail.hasData;
  const showSentencingTools = currentPhase >= 3;
  const showCourtHearings = currentPhase >= 1 && (panelData.hearings.hasData || currentPhase >= 2);
  const showPACE = currentPhase >= 1 && (panelData.pace.hasData || currentPhase >= 2);

  // Determine if we have extracted data (independent of analysis mode)
  // These checks are extraction-based only, NOT analysis-based
  const hasExtractedSummary = snapshot?.caseMeta?.title && snapshot.caseMeta.title !== "Untitled Case";
  const hasExtractedFacts = (snapshot?.evidence?.documents?.length ?? 0) >= 1;
  const hasCharges = (snapshot?.charges?.length ?? 0) >= 1;
  const hasReadLayerData = hasExtractedSummary || hasExtractedFacts || hasCharges;

  return (
    <div className="space-y-6">
      {/* No-hallucination guarantee – visible trust line */}
      <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-center">
        <p className="text-xs text-muted-foreground">
          All outputs are evidence-linked. No predictions. No legal advice. Solicitor-controlled.
        </p>
      </div>

      {/* TOP: Status strip + at-a-glance + Jump to – so Jump to is at the top for easy section access */}
      {/* Phase 2: Case Status Strip */}
      {snapshotLoading ? (
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading case status...</span>
          </div>
        </Card>
      ) : snapshotError ? (
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">
            Case status will appear once analysis is run.
          </div>
        </Card>
      ) : snapshot ? (
        <FoldSection title="Case status" defaultOpen={true}>
          <CaseStatusStrip snapshot={snapshot} />
        </FoldSection>
      ) : null}

      {/* Safety & disclosure at a glance + sticky Jump to nav – right under status strip */}
      <CriminalCaseAtAGlanceBar
        caseId={caseId}
        snapshot={snapshot ?? null}
        snapshotLoading={snapshotLoading}
        primaryStrategyLabel={committedStrategy?.primary ?? snapshot?.decisionLog?.currentPosition?.position ?? null}
      />

      {/* Pre-Analysis Read Layer – below Jump to so nav is always at top */}
      {hasReadLayerData && (
        <>
          {/* Case Summary - Show if we have case title or documents */}
          {hasExtractedSummary && (
            <FoldSection title="Case Summary" defaultOpen={false}>
              <ErrorBoundary fallback={
                <Card className="p-4">
                  <h2 className="text-xl font-bold text-foreground mb-2">{snapshot?.caseMeta?.title ?? "Untitled Case"}</h2>
                  <p className="text-sm text-muted-foreground">Summary will appear once documents are processed.</p>
                </Card>
              }>
                <CaseSummaryPanel
                  caseId={caseId}
                  caseTitle={snapshot?.caseMeta?.title ?? "Untitled Case"}
                  practiceArea={null}
                  summary={null}
                />
              </ErrorBoundary>
            </FoldSection>
          )}

          {/* Key Facts - Show if we have documents */}
          {hasExtractedFacts && (
            <FoldSection title="Key Facts" defaultOpen={false}>
              <ErrorBoundary fallback={
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Key facts will appear once documents are processed.</p>
                </Card>
              }>
                <CaseKeyFactsPanel caseId={caseId} />
              </ErrorBoundary>
            </FoldSection>
          )}

          {/* Charges - Show if charges exist (from snapshot, extraction-based) */}
          {hasCharges && (
            <FoldSection title="Charges" defaultOpen={true}>
              <ErrorBoundary fallback={
                <p className="text-sm text-muted-foreground">Charges will appear once documents are processed.</p>
              }>
                <ChargesPanel caseId={caseId} />
              </ErrorBoundary>
            </FoldSection>
          )}
        </>
      )}

      {/* Phase Selector */}
      <FoldSection title="Case phase" defaultOpen={true}>
        <CasePhaseSelector
          caseId={caseId}
          isDisclosureFirstMode={isDisclosureFirstMode}
          onPhaseChange={setCurrentPhase}
          defaultPhase={1}
          currentPhase={currentPhase}
          hasSavedPosition={hasSavedPosition}
          onRecordPosition={() => {
            setIsPositionModalOpen(true);
          }}
          disabledWhenUnsafe={effectiveProceduralSafety?.status === "UNSAFE_TO_PROCEED" || effectiveProceduralSafety?.status === "CONDITIONALLY_UNSAFE"}
          unsafeReason={effectiveProceduralSafety?.explanation || (effectiveProceduralSafety?.status ? "Critical disclosure missing" : undefined)}
        />
      </FoldSection>

      {/* Gate Banner - Show once at top if analysis is blocked (always visible when present) */}
      {gateBanner && (
        <FoldSection title="Analysis required" defaultOpen={true}>
          <AnalysisGateBanner
          banner={gateBanner.banner}
          diagnostics={gateBanner.diagnostics}
          showHowToFix={true}
          onRunAnalysis={async () => {
            try {
              console.log(`[CriminalCaseView] Starting re-run analysis for case ${caseId} (gate banner)`);
              // Call rerun endpoint directly for better UX and error handling
              const res = await fetch(`/api/cases/${caseId}/analysis/rerun`, {
                method: "POST",
                credentials: "include",
              });

              if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: "Failed to re-run analysis" }));
                const errorMessage = errorData.error || `Failed to re-run analysis (${res.status})`;
                console.error(`[CriminalCaseView] Re-run failed: ${res.status}`, errorData);
                throw new Error(errorMessage);
              }

              const data = await res.json();
              console.log(`[CriminalCaseView] Re-run successful: version ${data.version_number}`, data);
              
              // Wait a moment for the version to be fully written, then refresh
              setTimeout(() => {
                router.refresh();
                // Also trigger client-side refetch of dependent endpoints
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("analysis-rerun-complete", { 
                    detail: { versionNumber: data.version_number, caseId } 
                  }));
                }
              }, 750);
            } catch (error) {
              console.error(`[CriminalCaseView] Failed to re-run analysis for case ${caseId}:`, error);
              const errorMessage = error instanceof Error ? error.message : "Failed to re-run analysis. Please try again.";
              alert(errorMessage);
            }
          }}
          onAddDocuments={() => {
            // Navigate to case page with add documents action
            window.location.href = `/cases/${caseId}?action=add-documents`;
          }}
          // Prioritize "Add documents" when in thin pack preview mode
          primaryAction={snapshot?.analysis.canShowStrategyPreview && !snapshot?.analysis.canShowStrategyFull ? "addDocuments" : "runAnalysis"}
        />
        </FoldSection>
      )}

      {/* DEBUG: Strategy visibility – only when ?debug=1 in URL */}
      {currentPhase >= 2 && searchParams.get("debug") === "1" && (
        <Card className="p-4 bg-amber-500/5 border-amber-500/20">
          <h3 className="text-sm font-semibold text-foreground mb-2">DEBUG: Strategy visibility</h3>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
            {JSON.stringify({
              currentPhase,
              hasSavedPosition,
              savedPositionExists: !!savedPosition,
              snapshotExists: !!snapshot,
              analysisMode: snapshot?.analysis?.mode,
              strategyExists: !!snapshot?.strategy,
              strategyPrimaryExists: !!snapshot?.strategy?.primary,
              strategyDataExists: snapshot?.strategy?.strategyDataExists,
              committedStrategyExists: !!committedStrategy,
              hasAnyStrategyData: !!(
                snapshot?.strategy?.primary ||
                (snapshot?.strategy?.fallbacks && snapshot.strategy.fallbacks.length > 0) ||
                committedStrategy ||
                snapshot?.strategy?.hasRenderableData
              ),
            }, null, 2)}
          </pre>
        </Card>
      )}

      {/* Phase 2: Two-Column Layout (Evidence Left, Strategy Right) - SINGLE SOURCE OF TRUTH */}
      <div data-phase-2-section>
      {snapshotLoading ? (
        <Card className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading case data...</span>
          </div>
        </Card>
      ) : snapshotError ? (
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">
            Case data will appear once analysis is run.
          </div>
        </Card>
      ) : snapshot ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FoldSection title="Evidence" defaultOpen={true}>
            <ErrorBoundary fallback={mounted ? <div className="text-sm text-muted-foreground">Analysis will deepen as further disclosure is received.</div> : null}>
              {snapshot && (
                <div id="section-strategy" className="mb-6">
                  <CaseFightPlan
                    caseId={caseId}
                    committedStrategy={committedStrategy}
                    canShowStrategyOutputs={snapshot?.analysis?.canShowStrategyOutputs ?? false}
                    canShowStrategyPreview={snapshot?.analysis?.canShowStrategyPreview ?? false}
                    canShowStrategyFull={snapshot?.analysis?.canShowStrategyFull ?? false}
                    strategyDataExists={snapshot?.strategy?.strategyDataExists ?? false}
                  />
                </div>
              )}
              <CaseEvidenceColumn
                caseId={caseId}
                snapshot={snapshot}
                onAddDocument={() => setShowAddDocuments(true)}
                onAddEvidenceUpload={() => setShowAddEvidenceUpload(true)}
                currentPhase={currentPhase}
                savedPosition={currentPhase >= 2 ? savedPosition : null}
                onCommitmentChange={(commitment) => {
                  if (commitment) {
                    setCommittedStrategy(commitment);
                    setIsStrategyCommitted(true);
                    buildCaseSnapshot(caseId).then(setSnapshot).catch(console.error);
                  } else {
                    setCommittedStrategy(null);
                    setIsStrategyCommitted(false);
                  }
                }}
                onProceduralSafetyChange={setEffectiveProceduralSafety}
                hasClientInstructions={hasClientInstructions}
                onClientInstructionsSaved={() => setHasClientInstructions(true)}
              />
            </ErrorBoundary>
          </FoldSection>
          <FoldSection title="Strategy" defaultOpen={false}>
            <ErrorBoundary fallback={
              <div className="text-sm text-muted-foreground">
                {snapshot?.analysis.canShowStrategyPreview && !snapshot?.analysis.canShowStrategyFull
                  ? "Strategy preview available (thin pack). Add documents for full routes."
                  : "Run analysis to populate this section."}
              </div>
            }>
              <CaseStrategyColumn
                caseId={caseId}
                snapshot={snapshot}
                currentPhase={currentPhase}
                onPositionChange={(hasPosition) => {
                  setHasSavedPosition(hasPosition);
                  setCurrentPhase(hasPosition ? 2 : 1);
                }}
                savedPosition={savedPosition}
                onRecordPosition={() => {
                  setIsPositionModalOpen(true);
                }}
                onCommitmentChange={(commitment) => {
                  if (commitment) {
                    setCommittedStrategy(commitment);
                    setIsStrategyCommitted(true);
                    buildCaseSnapshot(caseId).then(setSnapshot).catch(console.error);
                  } else {
                    setCommittedStrategy(null);
                    setIsStrategyCommitted(false);
                  }
                }}
              />
            </ErrorBoundary>
          </FoldSection>
        </div>
      ) : (
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">
            Case data will appear once analysis is run.
          </div>
        </Card>
      )}
      </div>

      {/* Primary Strategy Plan - Phase 2+ only, shows after commitment */}
      {currentPhase >= 2 && isStrategyCommitted && (
        <FoldSection id="section-next-steps" title="Next steps" defaultOpen={true}>
          <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Strategy plan will appear once analysis is run.</div>}>
            <Phase2StrategyPlanPanel caseId={caseId} />
          </ErrorBoundary>
        </FoldSection>
      )}

      {/* Additional Tools - Collapsed (PACE, Court Hearings, Client Advice) */}
      <FoldSection title="Additional Tools" defaultOpen={false}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {showPACE && (
            <ErrorBoundary fallback={<Card className="p-4"><div className="text-sm text-muted-foreground">PACE compliance will appear once analysis is run.</div></Card>}>
              <PACEComplianceChecker caseId={caseId} />
            </ErrorBoundary>
          )}
          {showCourtHearings && (
            <ErrorBoundary fallback={<Card className="p-4"><div className="text-sm text-muted-foreground">Court hearings will appear once analysis is run.</div></Card>}>
              <CourtHearingsPanel caseId={caseId} currentPhase={currentPhase} />
            </ErrorBoundary>
          )}
          <ErrorBoundary fallback={<Card className="p-4"><div className="text-sm text-muted-foreground">Client advice will appear once analysis is run.</div></Card>}>
            <ClientAdvicePanel caseId={caseId} />
          </ErrorBoundary>
        </div>
      </FoldSection>

      {/* Phase 2: Bail Tools */}
      {currentPhase >= 2 ? (
        <FoldSection id="section-bail" title="Bail" defaultOpen={true}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {showBailTools && (
              <ErrorBoundary fallback={<Card className="p-4"><div className="text-sm text-muted-foreground">Bail application will appear once analysis is run.</div></Card>}>
                <BailApplicationPanel caseId={caseId} />
              </ErrorBoundary>
            )}
            <ErrorBoundary fallback={<Card className="p-4"><div className="text-sm text-muted-foreground">Bail tracker will appear once analysis is run.</div></Card>}>
              <BailTracker caseId={caseId} />
            </ErrorBoundary>
          </div>
        </FoldSection>
      ) : (
        <FoldSection title="Custody / Bail Tools" defaultOpen={false}>
          <div className="space-y-6">
            {showBailTools && (
              <ErrorBoundary fallback={<Card className="p-4"><div className="text-sm text-muted-foreground">Bail application will appear once analysis is run.</div></Card>}>
                <BailApplicationPanel caseId={caseId} />
              </ErrorBoundary>
            )}
            <ErrorBoundary fallback={<Card className="p-4"><div className="text-sm text-muted-foreground">Bail tracker will appear once analysis is run.</div></Card>}>
              <BailTracker caseId={caseId} />
            </ErrorBoundary>
          </div>
        </FoldSection>
      )}

      {/* Phase 3: Sentencing Tools (Only visible in Phase 3) */}
      {currentPhase >= 3 && (
        <FoldSection title="Sentencing Tools" defaultOpen={true}>
          <div className="space-y-6">
            {showSentencingTools && (
              <ErrorBoundary fallback={<Card className="p-4"><div className="text-sm text-muted-foreground">Sentencing mitigation will appear once analysis is run.</div></Card>}>
                <SentencingMitigationPanel caseId={caseId} />
              </ErrorBoundary>
            )}
          </div>
        </FoldSection>
      )}

      {/* Evidence Selector Modal (for analysis document selection) */}
      {showAddDocuments && (
        <EvidenceSelectorModal
          caseId={caseId}
          onClose={() => setShowAddDocuments(false)}
          onSuccess={() => {
            setShowAddDocuments(false);
            // Reload snapshot to reflect new documents
            buildCaseSnapshot(caseId).then(setSnapshot).catch(console.error);
            router.refresh();
          }}
          onUploadMoreEvidence={() => {
            setShowAddDocuments(false);
            setShowAddEvidenceUpload(true);
          }}
        />
      )}

      {/* Add Evidence Modal (Upload) */}
      {showAddEvidenceUpload && (
        <AddEvidenceModal
          caseId={caseId}
          caseTitle={snapshot?.caseMeta?.title || undefined}
          isOpen={showAddEvidenceUpload}
          onClose={() => setShowAddEvidenceUpload(false)}
          onSuccess={async () => {
            setShowAddEvidenceUpload(false);
            // Reload snapshot to reflect new documents
            try {
              const newSnapshot = await buildCaseSnapshot(caseId);
              setSnapshot(newSnapshot);
            } catch (error) {
              console.error("Failed to reload snapshot:", error);
            }
            router.refresh();
          }}
        />
      )}

      {/* Record Position Modal - Unified for all "Record position" buttons */}
      <RecordPositionModal
        caseId={caseId}
        isOpen={isPositionModalOpen}
        onClose={() => setIsPositionModalOpen(false)}
        onSuccess={async () => {
          // Refetch position after save; phase 2 persists from position existence
          try {
            const response = await fetch(`/api/criminal/${caseId}/position`, {
              credentials: "include",
            });
            if (response.ok) {
              const data = await response.json();
              if (data.ok && (data.data || data.position)) {
                setSavedPosition(data.data || data.position);
                setHasSavedPosition(true);
                setCurrentPhase(2);
              } else {
                setSavedPosition(null);
                setHasSavedPosition(false);
                setCurrentPhase(1);
              }
            }
          } catch (error) {
            console.error("[CriminalCaseView] Failed to refetch position:", error);
          }
          router.refresh();
        }}
        initialText={savedPosition?.position_text || ""}
        currentPhase={currentPhase}
        onPhase2Request={() => {
          setCurrentPhase(2);
        }}
        onAutoAdvanceToPhase2={() => {
          setCurrentPhase(2);
        }}
        showPhase2CTA={!hasSavedPosition && currentPhase === 1}
      />

      <BackToTop />
    </div>
  );
}

