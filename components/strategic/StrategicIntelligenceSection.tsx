"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StrategicOverviewCard } from "./StrategicOverviewCard";
import { StrategicRoutesPanel } from "./StrategicRoutesPanel";
import { LeverageAndWeakSpotsPanel } from "./LeverageAndWeakSpotsPanel";
import { TimePressureAndSettlementPanel } from "./TimePressureAndSettlementPanel";
import { JudicialExpectationsPanel } from "./JudicialExpectationsPanel";
import { MoveSequencePanel } from "./MoveSequencePanel";
import { AnalysisBanner } from "./AnalysisBanner";
import { AnalysisGateBanner, type AnalysisGateBannerProps } from "@/components/AnalysisGateBanner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";
import { normalizePracticeArea } from "@/lib/types/casebrain";
import type { SolicitorRole } from "@/lib/strategic/practice-area-viability";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type StrategicIntelligenceSectionProps = {
  caseId: string;
  practiceArea?: string | null;
};

type AnalysisBannerData = {
  severity: "warning" | "info" | "error";
  title: string;
  message: string;
  reasons?: string[];
  suggestedRole?: SolicitorRole;
};

export function StrategicIntelligenceSection({ caseId, practiceArea }: StrategicIntelligenceSectionProps) {
  const router = useRouter();
  const normalizedPracticeArea = normalizePracticeArea(practiceArea ?? undefined);
  const isCriminal = normalizedPracticeArea === "criminal";
  
  // Hard gate: Do not render any legacy strategy components for criminal cases
  // CaseFightPlan is the only strategy surface for criminal cases
  if (isCriminal) {
    return null;
  }
  
  const [summary, setSummary] = useState<{
    routes: number;
    leverage: number;
    weakSpots: number;
    expectations: number;
  } | null>(null);
  const [analysisBanner, setAnalysisBanner] = useState<AnalysisBannerData | null>(null);
  const [gateBanner, setGateBanner] = useState<{
    banner: AnalysisGateBannerProps["banner"];
    diagnostics?: AnalysisGateBannerProps["diagnostics"];
  } | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const overviewRes = await fetch(`/api/strategic/${caseId}/overview`).catch(() => null);
        
        if (overviewRes?.ok) {
          const overviewData = await overviewRes.json();
          const normalized = normalizeApiResponse(overviewData);
          
          // Check if gated (ok: false or banner exists)
          if (isGated(normalized)) {
            setGateBanner({
              banner: normalized.banner || {
                severity: "warning",
                title: "Insufficient text extracted",
                message: "Not enough extractable text to generate reliable analysis. Upload text-based PDFs or run OCR, then re-analyse.",
              },
              diagnostics: normalized.diagnostics,
            });
            setAnalysisBanner(null);
            setSummary({ routes: 0, leverage: 0, weakSpots: 0, expectations: 0 });
            return; // Don't fetch other endpoints if gated
          }
          
          // Check for analysis banner (old format - practice area mismatch)
          if (overviewData.analysisBanner?.severity === "warning") {
            setAnalysisBanner(overviewData.analysisBanner);
            setGateBanner(null);
            setSummary({ routes: 0, leverage: 0, weakSpots: 0, expectations: 0 });
            return; // Don't fetch other endpoints if banner exists
          } else {
            setAnalysisBanner(null);
            setGateBanner(null);
          }

          const [leverageRes, weakSpotsRes, expectationsRes] = await Promise.all([
            fetch(`/api/strategic/${caseId}/leverage`).catch(() => null),
            fetch(`/api/strategic/${caseId}/weak-spots`).catch(() => null),
            fetch(`/api/strategic/${caseId}/cpr-compliance`).catch(() => null),
          ]);

          const routes = normalized.data?.strategies?.length || 0;
          const leverage = leverageRes?.ok ? (await leverageRes.json())?.leveragePoints?.length || 0 : 0;
          const weakSpots = weakSpotsRes?.ok ? (await weakSpotsRes.json())?.weakSpots?.length || 0 : 0;
          const expectations = expectationsRes?.ok ? (await expectationsRes.json())?.expectations?.length || 0 : 0;

          setSummary({ routes, leverage, weakSpots, expectations });
        }
      } catch (err) {
        // Silently fail - summary is optional
      }
    }

    fetchSummary();
  }, [caseId]);

  const summaryItems = [];
  if (summary) {
    if (summary.routes > 0) summaryItems.push(`${summary.routes} strategic route${summary.routes !== 1 ? "s" : ""}`);
    if (summary.leverage > 0) summaryItems.push(`${summary.leverage} leverage point${summary.leverage !== 1 ? "s" : ""}`);
    if (summary.weakSpots > 0) summaryItems.push(`${summary.weakSpots} critical weakness${summary.weakSpots !== 1 ? "es" : ""}`);
    if (summary.expectations > 0) summaryItems.push(`${summary.expectations} judicial expectation${summary.expectations !== 1 ? "s" : ""}`);
  }

  const handleSwitchRole = async (role: SolicitorRole) => {
    // Map solicitor role to practice area
    const roleToPracticeArea: Record<SolicitorRole, string> = {
      criminal_solicitor: "criminal",
      clinical_neg_solicitor: "clinical_negligence",
      housing_solicitor: "housing_disrepair",
      pi_solicitor: "personal_injury",
      family_solicitor: "family",
      general_litigation_solicitor: "other_litigation",
    };

    const newPracticeArea = roleToPracticeArea[role];
    if (!newPracticeArea) return;

    try {
      // Update case practice area using the dedicated endpoint
      const response = await fetch(`/api/cases/${caseId}/practice-area`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practiceArea: newPracticeArea }),
      });

      if (!response.ok) {
        throw new Error("Failed to update practice area");
      }

      // Refresh the page to re-run analysis with new role
      router.refresh();
    } catch (error) {
      console.error("Failed to switch role:", error);
      // Could show a toast here
    }
  };

  return (
    <ErrorBoundary fallback={<div className="text-sm text-muted-foreground p-4">Strategic Intelligence temporarily unavailable.</div>}>
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-5 w-5 text-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Strategic Intelligence</h2>
          <Badge variant="outline" className="text-xs">BETA</Badge>
        </div>

        {/* Gate Banner - Show when analysis is blocked (rawCharsTotal=0, scanned, textThin) */}
        {gateBanner && (
          <AnalysisGateBanner
            banner={gateBanner.banner}
            diagnostics={gateBanner.diagnostics}
            showHowToFix={true}
          />
        )}

        {/* Analysis Banner - Show when mismatch detected */}
        {analysisBanner && analysisBanner.severity === "warning" && !gateBanner && (
          <AnalysisBanner
            severity={analysisBanner.severity}
            title={analysisBanner.title}
            message={analysisBanner.message}
            reasons={analysisBanner.reasons}
            suggestedRole={analysisBanner.suggestedRole}
            onSwitchRole={handleSwitchRole}
          />
        )}

        {/* Suppress all strategy panels when banner exists */}
        {(gateBanner || (analysisBanner && analysisBanner.severity === "warning")) ? (
          // Show only minimal UI when banner is present
          <div className="text-sm text-muted-foreground p-4 bg-muted/30 border border-border/50 rounded-lg">
            <p>Upload documents that match the selected solicitor role to see strategic analysis.</p>
          </div>
        ) : (
          <>
            {/* Summary Line - Dynamic based on what's found */}
            {summaryItems.length > 0 ? (
              <div className="text-sm text-muted-foreground bg-muted/30 border border-border/50 rounded-lg p-3">
                <p className="font-medium text-foreground mb-1">Based on the current bundle, CaseBrain has found:</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {summaryItems.map((item, idx) => (
                    <span key={idx}>• {item}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-muted/30 border border-border/50 rounded-lg p-3">
                <p className="font-medium text-foreground mb-1">Based on the current bundle, CaseBrain has found:</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span>• Strategic routes to exploit</span>
                  <span>• Critical evidence gaps</span>
                  <span>• Procedural leverage points</span>
                  <span>• Opponent weaknesses</span>
                </div>
              </div>
            )}

            {/* Overview Card */}
            <ErrorBoundary>
              <StrategicOverviewCard caseId={caseId} practiceArea={normalizedPracticeArea} />
            </ErrorBoundary>

            {/* Move Sequence Panel - Full Width */}
            <ErrorBoundary>
              <MoveSequencePanel caseId={caseId} />
            </ErrorBoundary>

            {/* Detailed Panels Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {!isCriminal && (
                <ErrorBoundary>
                  <StrategicRoutesPanel caseId={caseId} />
                </ErrorBoundary>
              )}

              <ErrorBoundary>
                <LeverageAndWeakSpotsPanel caseId={caseId} />
              </ErrorBoundary>

              {!isCriminal && (
                <ErrorBoundary>
                  <TimePressureAndSettlementPanel caseId={caseId} />
                </ErrorBoundary>
              )}

              {!isCriminal && (
                <ErrorBoundary>
                  <JudicialExpectationsPanel caseId={caseId} />
                </ErrorBoundary>
              )}
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}

