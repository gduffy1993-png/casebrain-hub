import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { assertRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateCaseBundlePdf } from "@/lib/pdf";
import { appendAuditLog } from "@/lib/audit";
import type { TimelineEvent, TimelineEventSource } from "@/types";

export const runtime = "nodejs";

/**
 * Legacy bundle route - redirects to new core bundle API
 * @deprecated Use /api/bundle/[caseId] instead
 */
export async function POST(request: Request) {
  const { userId, orgId } = await requireRole(["owner", "solicitor", "paralegal"]);
  assertRateLimit(`bundle:${userId}`, { limit: 5, windowMs: 60_000 });

  let caseId: string | undefined;
  try {
    const body = await request.json();
    caseId = body?.caseId;
  } catch {
    const formData = await request.formData();
    caseId = formData.get("caseId") as string | undefined;
  }

  if (!caseId) {
    return NextResponse.json(
      { error: "caseId is required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const [
    { data: caseRecord },
    { data: letters },
    { data: documents },
    { data: firmSettings },
    { data: riskFlags },
    { data: piCase },
  ] = await Promise.all([
    supabase
      .from("cases")
      .select("id, title, summary, org_id, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("letters")
      .select("id, body, version, created_by, updated_at, template_id")
      .eq("case_id", caseId)
      .order("version", { ascending: false }),
    supabase
      .from("documents")
      .select("id, name, summary, extracted_json, type, created_at")
      .eq("case_id", caseId),
    supabase
      .from("organisation_settings")
      .select("firm_name, firm_address, default_sign_off")
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("risk_flags")
      .select("id, flag_type, severity, description, detected_at, resolved")
      .eq("case_id", caseId)
      .order("detected_at", { ascending: false }),
    supabase
      .from("pi_cases")
      .select("*")
      .eq("id", caseId)
      .maybeSingle(),
  ]);

  if (!caseRecord) {
    console.error("[BUNDLE_EXPORT] Case not found", { caseId, orgId });
    return NextResponse.json(
      { error: "Case not found", message: "The specified case does not exist or you do not have access to it." },
      { status: 404 },
    );
  }

  // Guard against empty/null data
  if (!documents || documents.length === 0) {
    console.error("[BUNDLE_EXPORT] No documents found", { caseId });
    return NextResponse.json(
      { error: "No documents found", message: "This case has no documents. Upload documents before generating a bundle." },
      { status: 400 },
    );
  }

  const firmName = firmSettings?.firm_name ?? "Your firm";
  const firmAddress = firmSettings?.firm_address ?? "";
  const defaultSignOff = firmSettings?.default_sign_off ?? "";

  // Extract parties from documents
  const firstExtraction = documents?.[0]?.extracted_json as
    | { parties?: Array<{ name: string; role: string }> }
    | null
    | undefined;
  const clientName =
    firstExtraction?.parties?.find((p) => p.role === "client" || p.role === "claimant")
      ?.name ?? "";
  const defendantName =
    firstExtraction?.parties?.find(
      (p) => p.role === "defendant" || p.role === "opponent",
    )?.name ?? "";

  // Get template names for letters
  const templateIds = (letters ?? [])
    .map((l) => l.template_id)
    .filter((id): id is string => !!id);
  const { data: templates } = templateIds.length
    ? await supabase
        .from("letterTemplates")
        .select("id, name")
        .in("id", templateIds)
    : { data: null };
  const templateMap = new Map(
    (templates ?? []).map((t) => [t.id, t.name]),
  );

  const practiceAreaLabel =
    caseRecord.practice_area === "pi"
      ? "Personal Injury"
      : caseRecord.practice_area === "clinical_negligence"
        ? "Clinical Negligence"
        : caseRecord.practice_area === "housing_disrepair"
          ? "Housing Disrepair"
          : "General";

  // Guard against empty/null data before generating PDF
  if (!documents || documents.length === 0) {
    console.error("[BUNDLE_EXPORT] No documents found", { caseId, orgId });
    return NextResponse.json(
      {
        error: "No documents found",
        message: "This case has no documents. Upload documents before generating a bundle.",
      },
      { status: 400 },
    );
  }

  try {
    const pdf = await generateCaseBundlePdf({
    caseTitle: caseRecord.title,
    caseId: caseRecord.id,
    generatedBy: userId,
    generatedAt: new Date(),
    summary: caseRecord.summary ?? "No summary available.",
    firmName,
    firmAddress,
    defaultSignOff,
    clientName,
    defendantName,
    practiceArea: practiceAreaLabel,
    keyFacts: firstExtraction
      ? {
          parties: firstExtraction.parties ?? [],
          dates:
            (firstExtraction as { dates?: Array<{ label: string; isoDate: string }> })
              ?.dates ?? [],
          amounts:
            (firstExtraction as {
              amounts?: Array<{ label: string; value: number; currency: string }>;
            })?.amounts ?? [],
        }
      : undefined,
    piMeta: piCase
      ? {
          oicTrack: piCase.oic_track ?? null,
          injurySummary: piCase.injury_summary ?? null,
          whiplashTariffBand: piCase.whiplash_tariff_band ?? null,
          prognosisMonthsMin: piCase.prognosis_months_min ?? null,
          prognosisMonthsMax: piCase.prognosis_months_max ?? null,
          psychInjury: piCase.psych_injury ?? null,
          treatmentRecommended: piCase.treatment_recommended ?? null,
          medcoReference: piCase.medco_reference ?? null,
          liabilityStance: piCase.liability_stance ?? null,
        }
      : undefined,
    riskFlags: (riskFlags ?? []).map((flag) => ({
      type: flag.flag_type,
      severity: flag.severity,
      description: flag.description,
      detectedAt: flag.detected_at,
      resolved: flag.resolved,
    })),
    timeline:
      ((documents ?? [])
        .flatMap((document) => {
          const extracted = document.extracted_json as
            | {
                timeline?: Array<{
                  id: string;
                  date: string;
                  label: string;
                  description: string;
                  source?: string;
                }>;
              }
            | null;
          return extracted?.timeline ?? [];
        })
        .map<TimelineEvent>((event) => ({
          ...event,
          source: (event.source ?? "document") as TimelineEventSource,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))) ?? [],
    letters:
      (letters ?? []).map((letter) => ({
        title: templateMap.get(letter.template_id ?? "") ?? `Letter v${letter.version}`,
        version: letter.version,
        author: letter.created_by ?? "CaseBrain AI",
        body: letter.body,
        updatedAt: letter.updated_at ?? "",
        date: letter.updated_at ?? new Date().toISOString(),
      })) ?? [],
    documents:
      (documents ?? []).map((document) => ({
        name: document.name,
        summary: document.summary ?? "",
        type: document.type ?? "Unknown",
        uploadDate: document.created_at ?? "",
      })) ?? [],
  });

    await appendAuditLog({
      caseId,
      userId,
      action: "bundle_generated",
      details: {
        letters: letters?.length ?? 0,
        documents: documents?.length ?? 0,
      },
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${caseRecord.title.replace(/\s+/g, "_")}_bundle.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("[BUNDLE_EXPORT] Error generating bundle PDF", { error, caseId, orgId, userId });
    return NextResponse.json(
      {
        error: "Failed to generate bundle",
        message: error instanceof Error ? error.message : "Unknown error occurred while generating PDF. Please try again or contact support.",
      },
      { status: 500 },
    );
  }
}

