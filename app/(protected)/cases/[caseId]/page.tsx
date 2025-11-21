import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ClipboardEdit, Download, FileText, History } from "lucide-react";
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
import { PiMedicalReportsPanel } from "@/components/pi/PiMedicalReportsPanel";
import { PiOffersPanel } from "@/components/pi/PiOffersPanel";
import { PiHearingsPanel } from "@/components/pi/PiHearingsPanel";
import { PiDisbursementsPanel } from "@/components/pi/PiDisbursementsPanel";
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
import { AwaabMonitorPanel } from "@/components/housing/AwaabMonitorPanel";
import { SupervisionPackPanel } from "@/components/housing/SupervisionPackPanel";
import { LitigationGuidancePanel } from "@/components/core/LitigationGuidancePanel";
import { RiskAlertsPanel } from "@/components/core/RiskAlertsPanel";
import { Badge } from "@/components/ui/badge";
import { CaseArchiveButton } from "@/components/cases/CaseArchiveButton";

type CasePageParams = {
  params: { caseId: string };
};

export default async function CaseDetailPage({ params }: CasePageParams) {
  const { caseId } = params;
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .select("id, title, summary, extracted_summary, timeline, org_id, practice_area")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (caseError) {
    throw caseError;
  }

  if (!caseRecord) {
    notFound();
  }

  const [
    { data: documents },
    { data: letters },
    { data: riskFlags },
    { data: deadlines },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("id, name, type, uploaded_by, created_at, extracted_json")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false }),
    supabase
      .from("letters")
      .select("id, template_id, version, body, updated_at, created_by")
      .eq("case_id", caseId)
      .order("version", { ascending: false }),
    supabase
      .from("risk_flags")
      .select("id, flag_type, severity, description, detected_at, resolved, resolved_at")
      .eq("case_id", caseId)
      .order("detected_at", { ascending: false }),
    supabase
      .from("deadlines")
      .select("id, title, due_date")
      .eq("case_id", caseId)
      .order("due_date", { ascending: true }),
  ]);

  const isPiCase =
    caseRecord.practice_area === "pi" || caseRecord.practice_area === "clinical_negligence";
  const isHousingCase = caseRecord.practice_area === "housing_disrepair";

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
    const [
      { data: piCaseRecord },
      { data: medicalReports },
      { data: offers },
      { data: hearings },
      { data: disbursements },
    ] = await Promise.all([
      supabase.from("pi_cases").select("*").eq("id", caseId).maybeSingle(),
      supabase.from("pi_medical_reports").select("*").eq("case_id", caseId).eq("org_id", orgId),
      supabase.from("pi_offers").select("*").eq("case_id", caseId).eq("org_id", orgId),
      supabase.from("pi_hearings").select("*").eq("case_id", caseId).eq("org_id", orgId),
      supabase.from("pi_disbursements").select("*").eq("case_id", caseId).eq("org_id", orgId),
    ]);

    piCase = piCaseRecord ?? null;
    piMedicalReports = medicalReports ?? [];
    piOffers = offers ?? [];
    piHearings = hearings ?? [];
    piDisbursements = disbursements ?? [];
  }

  if (isHousingCase) {
    const [
      { data: housingCaseRecord },
      { data: defects },
      { data: complianceData },
    ] = await Promise.all([
      supabase.from("housing_cases").select("*").eq("id", caseId).eq("org_id", orgId).maybeSingle(),
      supabase.from("housing_defects").select("*").eq("case_id", caseId).eq("org_id", orgId),
      fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/housing/compliance/${caseId}`)
        .then((r) => r.ok ? r.json() : { checks: [] })
        .catch(() => ({ checks: [] })),
    ]);

    housingCase = housingCaseRecord ?? null;
    housingDefects = defects ?? [];
    complianceChecks = complianceData.checks ?? [];
  }

  const timeline =
    documents
      ?.flatMap((doc) => {
        const extracted = doc.extracted_json as ExtractedCaseFacts | null;
        return extracted?.timeline ?? [];
      })
      .sort((a, b) => a.date.localeCompare(b.date)) ?? [];

  const labsEnabled = process.env.NEXT_PUBLIC_ENABLE_LABS === "true";
  const latestDocument = documents?.[0];
  const practiceAreaLabel =
    caseRecord.practice_area === "pi"
      ? "Personal Injury"
      : caseRecord.practice_area === "clinical_negligence"
        ? "Clinical Negligence"
        : caseRecord.practice_area === "housing_disrepair"
          ? "Housing Disrepair"
          : "General";

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr_320px]">
      <aside className="space-y-4">
        <Card title="Case Files">
          <ul className="space-y-3">
            {(documents ?? []).map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between rounded-2xl border bg-surface-muted/70 px-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-accent">{doc.name}</p>
                  <p className="text-xs text-accent/50">
                    Uploaded{" "}
                    {new Date(doc.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <Button variant="secondary" size="sm" className="gap-2">
                  <Download className="h-4 w-4" /> View
                </Button>
              </li>
            ))}
          </ul>
          {!documents?.length && (
            <p className="text-sm text-accent/60">
              No documents uploaded. Use the upload tab to add evidence.
            </p>
          )}
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
        <Card
          title={
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span>{caseRecord.title}</span>
                <Badge variant="default">{practiceAreaLabel}</Badge>
              </div>
              <CaseArchiveButton caseId={caseId} caseTitle={caseRecord.title} />
            </div>
          }
        >
          <p className="text-sm text-accent/70">
            {caseRecord.summary ?? "No summary captured yet."}
          </p>
          {latestDocument && caseRecord.summary && (
            <p className="mt-3 text-xs text-accent/50">
              Last updated from: <span className="font-medium">{latestDocument.name}</span> on{" "}
              {new Date(latestDocument.created_at).toLocaleDateString("en-GB")}
            </p>
          )}
          {labsEnabled && (
            <>
              <div className="mt-4">
                <ConditionalPortalShare caseId={caseId} />
              </div>
              <div className="mt-4">
                <CaseTypeSelector caseId={caseId} initialValue={caseRecord.practice_area ?? "general"} />
              </div>
            </>
          )}
        </Card>

        {labsEnabled && isPiCase && piCase ? (
          <PiCaseOverview caseId={caseId} caseType={caseCaseType(caseRecord.practice_area)} piCase={piCase} />
        ) : null}

        {labsEnabled && isPiCase && piCase ? (
          <PiLetterPreview
            caseId={caseId}
            caseTitle={caseRecord.title}
            practiceArea={caseRecord.practice_area ?? "general"}
          />
        ) : null}

        <KeyFactsPanel documents={documents ?? []} />

        <LitigationGuidancePanel caseId={caseId} />

        {isPiCase && piCase ? (
          <OicMedcoPanel caseId={caseId} piCase={piCase} />
        ) : null}

        {isHousingCase && housingCase ? (
          <>
            <HousingCaseOverview
              caseId={caseId}
              housingCase={housingCase}
              defects={housingDefects}
            />
            <RiskAlertsPanel caseId={caseId} />
            <BundleCheckerPanel caseId={caseId} />
            <AwaabMonitorPanel caseId={caseId} />
            <SupervisionPackPanel caseId={caseId} />
            <HousingCompliancePanel
              housingCase={housingCase}
              complianceChecks={complianceChecks}
            />
            <HousingDeadlineTracker caseId={caseId} />
            <HousingTimelineBuilder caseId={caseId} />
            <ScheduleOfDisrepairPanel caseId={caseId} />
          </>
        ) : null}

        {labsEnabled && isPiCase && piCase ? (
          <>
            <PiMedicalReportsPanel caseId={caseId} reports={piMedicalReports} />
            <PiOffersPanel caseId={caseId} offers={piOffers} />
            <PiHearingsPanel caseId={caseId} hearings={piHearings} />
            <PiDisbursementsPanel caseId={caseId} disbursements={piDisbursements} />
            <PiProtocolTimeline deadlines={deadlines ?? []} />
          </>
        ) : null}
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

        <Card title="Risk alerts">
          <ul className="space-y-3">
            {(riskFlags ?? []).length ? (
              riskFlags!.map((flag) => (
                <li
                  key={flag.id}
                  className={`rounded-2xl border bg-surface-muted/70 p-3 text-sm ${
                    flag.resolved ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
                      <AlertTriangle
                        className={`h-4 w-4 ${
                          flag.severity === "critical"
                            ? "text-danger"
                            : flag.severity === "high"
                              ? "text-warning"
                              : "text-accent/40"
                        }`}
                      />
                      <span className="text-accent/50">
                        {flag.flag_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-accent/40">
                        {new Date(flag.detected_at).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-accent/70">
                      {flag.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-accent/70">{flag.description}</p>
                  <p className="mt-1 text-[11px] text-accent/40">
                    {flag.resolved
                      ? `Resolved ${flag.resolved_at ? new Date(flag.resolved_at).toLocaleDateString("en-GB") : ""}`
                      : "Outstanding"}
                  </p>
                </li>
              ))
            ) : (
              <p className="text-sm text-accent/60">
                No risk alerts detected yet for this case.
              </p>
            )}
          </ul>
        </Card>

        <Card title="Timeline">
          <ul className="space-y-4">
            {timeline.map((event) => (
              <li
                key={event.id}
                className="flex gap-3 rounded-2xl border border-primary/10 bg-surface-muted/70 p-3"
              >
                <div className="mt-1 rounded-full bg-primary/20 p-2">
                  <History className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-accent/50">
                    {new Date(event.date).toLocaleDateString("en-GB")}
                  </p>
                  <p className="text-sm font-semibold text-accent">
                    {event.label}
                  </p>
                  <p className="text-xs text-accent/60">{event.description}</p>
                </div>
              </li>
            ))}
          </ul>
          {!timeline.length && (
            <p className="text-sm text-accent/60">
              Timeline not populated yet. Upload more documents to enrich it.
            </p>
          )}
        </Card>

        <Card title="Export Bundle">
          <p className="text-sm text-accent/60">
            Generate a PDF bundle containing the summary, timeline, letters,
            and attachments. Watermark applied automatically.
          </p>
          <div className="mt-4 space-y-2">
            <a href={`/api/bundle/${caseId}`} download>
              <Button className="w-full gap-2" variant="primary">
                <FileText className="h-4 w-4" />
                Export Bundle
              </Button>
            </a>
            <a href={`/api/handover/${caseId}?format=markdown`} download>
              <Button className="w-full gap-2" variant="secondary">
                <FileText className="h-4 w-4" />
                Export Handover Pack
              </Button>
            </a>
          </div>
        </Card>
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

