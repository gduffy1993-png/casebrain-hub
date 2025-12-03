import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  FileWarning,
  CheckCircle,
  XCircle,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { buildCaseComplianceScore, getLimitationSeverity } from "@/lib/compliance";
import { findMissingEvidence } from "@/lib/missing-evidence";
import { calculateLimitation } from "@/lib/core/limitation";
import type { CaseComplianceScore, RiskFlag, Severity, HeatmapStatus } from "@/lib/types/casebrain";

export default async function ComplianceDashboardPage() {
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  // Fetch all active (non-archived) cases
  const { data: cases, error: casesError } = await supabase
    .from("cases")
    .select("id, title, summary, practice_area, created_at, updated_at")
    .eq("org_id", orgId)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });

  if (casesError) {
    throw casesError;
  }

  // Build compliance scores for all cases
  const complianceScores: CaseComplianceScore[] = [];

  for (const caseItem of cases ?? []) {
    // Fetch related data for this case
    const [
      { data: documents },
      { data: riskFlags },
      { data: notes },
    ] = await Promise.all([
      supabase
        .from("documents")
        .select("id, name, type, created_at")
        .eq("case_id", caseItem.id),
      supabase
        .from("risk_flags")
        .select("id, flag_type, severity, description, resolved, detected_at")
        .eq("case_id", caseItem.id)
        .eq("resolved", false),
      supabase
        .from("case_notes")
        .select("id, created_at")
        .eq("case_id", caseItem.id)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    // Normalize practice area
    const normalizedPracticeArea = caseItem.practice_area === "housing_disrepair" 
      ? "housing_disrepair" 
      : caseItem.practice_area === "personal_injury" || caseItem.practice_area === "pi"
        ? "personal_injury" 
        : caseItem.practice_area === "clinical_negligence" 
          ? "clinical_negligence"
          : caseItem.practice_area === "family"
            ? "family"
            : "other_litigation";
    
    // Legacy mapping for limitation calculation
    const practiceAreaForLimitation = normalizedPracticeArea === "housing_disrepair"
      ? "housing"
      : normalizedPracticeArea === "personal_injury"
        ? "pi_rta"
        : normalizedPracticeArea === "clinical_negligence"
          ? "clin_neg"
          : "other";

    const limitationResult = calculateLimitation({
      incidentDate: caseItem.created_at, // Fallback - ideally from extracted facts
      practiceArea: practiceAreaForLimitation as "housing" | "pi_rta" | "pi_general" | "clin_neg" | "other",
    });

    // Find missing evidence
    const docsForEvidence = (documents ?? []).map(d => ({
      name: d.name,
      type: d.type ?? undefined,
    }));
    const missingEvidence = findMissingEvidence(
      caseItem.id,
      caseItem.practice_area ?? "general",
      docsForEvidence,
    );

    // Convert risk flags
    const convertedRiskFlags: RiskFlag[] = (riskFlags ?? []).map(rf => ({
      id: rf.id,
      caseId: caseItem.id,
      severity: rf.severity.toUpperCase() as Severity,
      type: rf.flag_type as RiskFlag["type"],
      code: rf.flag_type.toUpperCase(),
      title: rf.flag_type.replace(/_/g, " "),
      message: rf.description,
      source: "risk_detection",
      status: rf.resolved ? "resolved" : "outstanding",
      createdAt: rf.detected_at,
    }));

    // Build compliance score
    const score = buildCaseComplianceScore({
      caseId: caseItem.id,
      caseTitle: caseItem.title,
      practiceArea: caseItem.practice_area ?? "general",
      limitationInfo: limitationResult.limitationDate ? {
        caseId: caseItem.id,
        causeOfAction: "",
        primaryLimitationDate: limitationResult.limitationDate,
        daysRemaining: limitationResult.daysRemaining ?? 0,
        isExpired: limitationResult.isExpired,
        severity: getLimitationSeverity(limitationResult.daysRemaining),
        practiceArea: normalizedPracticeArea as import("@/lib/types/casebrain").PracticeArea,
      } : undefined,
      riskFlags: convertedRiskFlags,
      missingEvidence,
      documents: documents ?? [],
      hasAttendanceNote: (notes?.length ?? 0) > 0,
      lastNoteDate: notes?.[0]?.created_at,
      caseCreatedAt: caseItem.created_at,
    });

    complianceScores.push(score);
  }

  // Sort by score (lowest first - most urgent)
  complianceScores.sort((a, b) => a.overallScore - b.overallScore);

  // Calculate summary stats
  const criticalCases = complianceScores.filter(c => c.status === "RED").length;
  const warningCases = complianceScores.filter(c => c.status === "AMBER").length;
  const healthyCases = complianceScores.filter(c => c.status === "GREEN").length;
  const totalRisks = complianceScores.reduce((sum, c) => sum + c.riskCounts.critical + c.riskCounts.high, 0);
  const totalMissingEvidence = complianceScores.reduce((sum, c) => sum + c.missingEvidenceCount, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-accent">Compliance Dashboard</h1>
            <p className="text-sm text-accent-soft">
              SRA compliance, limitation risks, and case health at a glance
            </p>
          </div>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Critical Cases"
          value={criticalCases}
          icon={<XCircle className="h-5 w-5" />}
          status="RED"
        />
        <StatCard
          label="Warning Cases"
          value={warningCases}
          icon={<AlertTriangle className="h-5 w-5" />}
          status="AMBER"
        />
        <StatCard
          label="Healthy Cases"
          value={healthyCases}
          icon={<CheckCircle className="h-5 w-5" />}
          status="GREEN"
        />
        <StatCard
          label="Open Risks"
          value={totalRisks}
          icon={<FileWarning className="h-5 w-5" />}
          status={totalRisks > 10 ? "RED" : totalRisks > 5 ? "AMBER" : "GREEN"}
        />
        <StatCard
          label="Missing Evidence"
          value={totalMissingEvidence}
          icon={<TrendingDown className="h-5 w-5" />}
          status={totalMissingEvidence > 20 ? "RED" : totalMissingEvidence > 10 ? "AMBER" : "GREEN"}
        />
      </div>

      {/* Cases Table */}
      <Card
        title="All Cases by Compliance Score"
        description="Cases with the lowest scores need immediate attention"
      >
        {complianceScores.length > 0 ? (
          <div className="space-y-3">
            {complianceScores.map((score, index) => (
              <CaseComplianceRow key={score.caseId} score={score} rank={index + 1} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="h-12 w-12 text-accent-muted" />
            <p className="mt-4 text-lg font-medium text-accent">No active cases</p>
            <p className="mt-1 text-sm text-accent-soft">
              Create a case to start tracking compliance
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  status,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  status: HeatmapStatus;
}) {
  const colors = {
    RED: "from-danger/20 to-danger/5 border-danger/30 text-danger",
    AMBER: "from-warning/20 to-warning/5 border-warning/30 text-warning",
    GREEN: "from-success/20 to-success/5 border-success/30 text-success",
  };

  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${colors[status]}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium opacity-80">{label}</span>
        {icon}
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function CaseComplianceRow({
  score,
  rank,
}: {
  score: CaseComplianceScore;
  rank: number;
}) {
  const statusColors = {
    RED: "bg-danger",
    AMBER: "bg-warning",
    GREEN: "bg-success",
  };

  const severityBadge = (severity: Severity) => {
    const variants: Record<Severity, "danger" | "warning" | "primary" | "success"> = {
      CRITICAL: "danger",
      HIGH: "warning",
      MEDIUM: "primary",
      LOW: "success",
    };
    return <Badge variant={variants[severity]} size="sm">{severity}</Badge>;
  };

  return (
    <Link
      href={`/cases/${score.caseId}`}
      className="group block rounded-xl border border-white/10 bg-surface-muted/50 p-4 transition-all hover:border-primary/30 hover:bg-surface-muted"
    >
      <div className="flex items-start gap-4">
        {/* Score Circle */}
        <div className="relative flex-shrink-0">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full ${statusColors[score.status]}`}
          >
            <span className="text-lg font-bold text-white">{score.overallScore}</span>
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[10px] font-bold text-accent-soft">
            #{rank}
          </span>
        </div>

        {/* Case Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-accent truncate group-hover:text-primary transition-colors">
              {score.caseTitle}
            </h3>
            <Badge variant="outline" size="sm">
              {score.practiceArea.replace(/_/g, " ")}
            </Badge>
          </div>

          {/* Metrics Row */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            {/* Limitation */}
            {score.limitationDaysRemaining !== undefined && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-accent-muted" />
                <span className={score.limitationDaysRemaining <= 90 ? "text-danger" : "text-accent-soft"}>
                  {score.limitationDaysRemaining <= 0 
                    ? "EXPIRED" 
                    : `${score.limitationDaysRemaining}d to limitation`}
                </span>
              </div>
            )}

            {/* Risks */}
            {(score.riskCounts.critical > 0 || score.riskCounts.high > 0) && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                <span className="text-accent-soft">
                  {score.riskCounts.critical > 0 && (
                    <span className="text-danger">{score.riskCounts.critical} critical</span>
                  )}
                  {score.riskCounts.critical > 0 && score.riskCounts.high > 0 && ", "}
                  {score.riskCounts.high > 0 && (
                    <span className="text-warning">{score.riskCounts.high} high</span>
                  )}
                </span>
              </div>
            )}

            {/* Missing Evidence */}
            {score.missingEvidenceCount > 0 && (
              <div className="flex items-center gap-1">
                <FileWarning className="h-3.5 w-3.5 text-accent-muted" />
                <span className="text-accent-soft">{score.missingEvidenceCount} missing</span>
              </div>
            )}

            {/* Awaab */}
            {score.awaabRiskLevel && score.awaabRiskLevel !== "LOW" && (
              <Badge variant={score.awaabRiskLevel === "CRITICAL" ? "danger" : "warning"} size="sm">
                Awaab {score.awaabRiskLevel}
              </Badge>
            )}
          </div>

          {/* Compliance Gaps */}
          {score.complianceGaps.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {score.complianceGaps.slice(0, 4).map((gap) => (
                <span
                  key={gap.type}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                    gap.severity === "CRITICAL"
                      ? "bg-danger/20 text-danger"
                      : gap.severity === "HIGH"
                        ? "bg-warning/20 text-warning"
                        : "bg-accent/10 text-accent-soft"
                  }`}
                >
                  <XCircle className="h-2.5 w-2.5" />
                  {gap.label}
                </span>
              ))}
              {score.complianceGaps.length > 4 && (
                <span className="text-[10px] text-accent-muted">
                  +{score.complianceGaps.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Severity Badge */}
        <div className="flex-shrink-0">
          {severityBadge(score.limitationSeverity)}
        </div>
      </div>
    </Link>
  );
}

