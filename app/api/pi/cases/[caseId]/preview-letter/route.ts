import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { renderPiLetterTemplate } from "@/lib/pi/letters";

export const runtime = "nodejs";

const BUILT_IN_TEMPLATES: Record<string, { name: string; description: string; body: string }> = {
  cnf: {
    name: "Claim notification (CNF)",
    description: "Initial notification to the compensator outlining the incident details.",
    body: `Dear Sir/Madam,

We are instructed by {{client_name}} in respect of injuries sustained on {{accident_date_long}}. Please treat this letter as a formal Claim Notification Form.

Incident summary:
- Accident date: {{accident_date_long}}
- Liability stance: {{liability_stance}}
- Injury description: {{injury_description}}

Please acknowledge within 5 working days and confirm insurer details.

Yours faithfully,
CaseBrain PI Team`,
  },
  insurer_chaser: {
    name: "Insurer chaser",
    description: "Reminder to the insurer to respond within the protocol timeframe.",
    body: `Dear Sir/Madam,

We wrote on {{accident_date_long}} notifying you of our client’s claim. We have not yet received acknowledgement or policy confirmation.

Please confirm receipt of the claim within 48 hours to avoid escalation.

Yours faithfully,
CaseBrain PI Team`,
  },
  records_request: {
    name: "Medical records request",
    description: "Request for GP/medical records to progress quantum assessment.",
    body: `Dear Records Department,

Re: {{client_name}} – Date of birth {{client_dob}}

Please supply the complete medical records covering the period 12 months pre-incident to present. The incident occurred on {{accident_date_long}}.

Records may be provided electronically to this email address. Please confirm any copying charges prior to release.

Yours faithfully,
CaseBrain PI Team`,
  },
  client_update: {
    name: "Client update",
    description: "Client-facing update summarising progress and next steps.",
    body: `Dear {{client_first_name}},

We are progressing your personal injury claim. Key milestones:

- Claim submitted: {{accident_date_long}}
- Current stage: {{case_stage}}
- Latest limitation date: {{limitation_date}}

Next steps:

- Await insurer liability response
- Review medical evidence as soon as reports land

We will keep you informed of any material developments.

Best regards,
CaseBrain PI Team`,
  },
};

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: { caseId: string };
  },
) {
  const { caseId } = params;
  const { orgId } = await requireRole(["owner", "solicitor", "paralegal"]);

  const url = new URL(request.url);
  const templateKey = url.searchParams.get("template") ?? "cnf";

  const baseTemplate = BUILT_IN_TEMPLATES[templateKey];
  if (!baseTemplate) {
    return NextResponse.json({ error: "Template not recognised." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  const [{ data: caseRecord }, { data: piCase }, { data: disbursements }, { data: templateOverride }] =
    await Promise.all([
      supabase
        .from("cases")
        .select("id, title, summary, practice_area")
        .eq("id", caseId)
        .eq("org_id", orgId)
        .maybeSingle(),
      supabase.from("pi_cases").select("*").eq("id", caseId).eq("org_id", orgId).maybeSingle(),
      supabase.from("pi_disbursements").select("*").eq("case_id", caseId).eq("org_id", orgId),
      supabase
        .from("pi_letter_templates")
        .select("id, code, name, description, body")
        .eq("org_id", orgId)
        .eq("code", templateKey)
        .maybeSingle(),
    ]);

  if (!caseRecord) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  const selectedTemplate = templateOverride ?? {
    id: null,
    code: templateKey,
    name: baseTemplate.name,
    description: baseTemplate.description,
    body: baseTemplate.body,
  };

  const body = renderPiLetterTemplate(selectedTemplate.body, {
    caseTitle: caseRecord.title,
    piCase: piCase ?? null,
    disbursements: disbursements ?? [],
  });

  return NextResponse.json({
    ok: true,
    template: {
      id: selectedTemplate.id,
      code: selectedTemplate.code,
      name: selectedTemplate.name,
      description: selectedTemplate.description,
    },
    body,
  });
}


