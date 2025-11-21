import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { assertRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateLetterDraft } from "@/lib/ai";
import { appendAuditLog } from "@/lib/audit";
import { detectRiskFlags, storeRiskFlags, notifyHighSeverityFlags } from "@/lib/risk";
import type { ExtractedCaseFacts } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId, orgId } = await requireRole(["owner", "solicitor", "paralegal"]);
  assertRateLimit(`letter:${userId}`, { limit: 10, windowMs: 60_000 });

  const body = await request.json();
  const caseId = body?.caseId as string | undefined;
  const templateId = body?.templateId as string | undefined;
  const notes = body?.notes as string | undefined;
  const actingFor = (body?.actingFor as "claimant" | "defendant") ?? "claimant";

  if (!caseId || !templateId) {
    return NextResponse.json(
      { error: "caseId and templateId required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  const [
    { data: caseRecord },
    { data: template },
    { data: documents },
    { data: firmSettings },
  ] = await Promise.all([
    supabase
      .from("cases")
      .select("id, org_id, summary, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("letterTemplates")
      .select("id, name, body_template, variables")
      .eq("id", templateId)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("extracted_json")
      .eq("case_id", caseId),
    supabase
      .from("organisation_settings")
      .select("default_sign_off")
      .eq("org_id", orgId)
      .maybeSingle(),
  ]);

  if (!caseRecord) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }
  if (!template) {
    return NextResponse.json(
      { error: "Template not found" },
      { status: 404 },
    );
  }

  const mergedFacts = mergeExtractedFacts(documents ?? []);

  const draft = await generateLetterDraft({
    template: {
      id: template.id,
      name: template.name,
      bodyTemplate: template.body_template,
      variables: template.variables ?? [],
    },
    facts: mergedFacts,
    notes,
    actingFor,
  });

  const signOff = firmSettings?.default_sign_off ?? "";
  const letterBody = signOff
    ? `${draft.body}\n\n${signOff}`
    : draft.body;

  const { data: latestVersion } = await supabase
    .from("letters")
    .select("version")
    .eq("case_id", caseId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

  const { data: letter, error } = await supabase
    .from("letters")
    .insert({
      case_id: caseId,
      template_id: templateId,
      body: letterBody,
      version: nextVersion,
      created_by: userId,
    })
    .select("id, version")
    .maybeSingle();

  if (error || !letter) {
    return NextResponse.json(
      { error: "Failed to save letter" },
      { status: 500 },
    );
  }

  await appendAuditLog({
    caseId,
    userId,
    action: "letter_generated",
    details: {
      letterId: letter.id,
      templateId,
      version: letter.version,
    },
  });

  const riskCandidates = detectRiskFlags({
    orgId,
    caseId,
    sourceType: "letter",
    sourceId: letter.id,
    documentName: template.name,
    text: draft.body,
    extractedFacts: {
      practiceArea: caseRecord?.practice_area,
      housingMeta: mergedFacts.housingMeta
        ? {
            hhsrs_category_1_hazards: mergedFacts.housingMeta.hhsrsHazards?.filter((h) =>
              ["damp", "mould", "structural"].includes(h.toLowerCase()),
            ),
            hhsrs_category_2_hazards: mergedFacts.housingMeta.hhsrsHazards?.filter(
              (h) => !["damp", "mould", "structural"].includes(h.toLowerCase()),
            ),
            unfit_for_habitation: mergedFacts.housingMeta.unfitForHabitation ?? false,
            tenant_vulnerability: mergedFacts.housingMeta.tenantVulnerability ?? [],
          }
        : undefined,
      dates: mergedFacts.dates,
      timeline: mergedFacts.timeline,
    },
  });

  if (riskCandidates.length) {
    const storedFlags = await storeRiskFlags(supabase, riskCandidates);
    await notifyHighSeverityFlags(storedFlags, userId);
  }

  return NextResponse.json({
    letterId: letter.id,
    version: letter.version,
    body: letterBody,
    reasoning: draft.reasoning,
    risks: draft.risks,
  });
}

function mergeExtractedFacts(documents: Array<{ extracted_json: unknown }>): ExtractedCaseFacts {
  const empty: ExtractedCaseFacts = {
    parties: [],
    dates: [],
    amounts: [],
    claimType: "",
    summary: "",
    keyIssues: [],
    timeline: [],
  };

  return documents.reduce<ExtractedCaseFacts>((acc, doc) => {
    const data = doc.extracted_json as ExtractedCaseFacts | null;
    if (!data) {
      return acc;
    }
    return {
      parties: uniqBy([...acc.parties, ...data.parties], "name"),
      dates: uniqBy([...acc.dates, ...data.dates], "isoDate"),
      amounts: uniqBy([...acc.amounts, ...data.amounts], "label"),
      claimType: acc.claimType || data.claimType,
      summary: acc.summary || data.summary,
      keyIssues: uniq([...acc.keyIssues, ...data.keyIssues]),
      timeline: uniqBy([...acc.timeline, ...data.timeline], "id"),
    };
  }, empty);
}

function uniq<T>(input: T[]) {
  return Array.from(new Set(input));
}

function uniqBy<T extends Record<string, unknown>>(input: T[], key: keyof T) {
  const seen = new Set();
  const result: T[] = [];
  input.forEach((item) => {
    const value = item[key];
    if (value == null) return;
    if (!seen.has(value)) {
      seen.add(value);
      result.push(item);
    }
  });
  return result;
}

