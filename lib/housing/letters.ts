"use server";

import { getSupabaseAdminClient } from "@/lib/supabase";
import { DEFAULT_HOUSING_TEMPLATES } from "./letters-config";

export type HousingLetterTemplate = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  body: string;
  variables: string[];
};

/**
 * Get housing letter template (org-specific or global default)
 */
export async function getHousingLetterTemplate(
  code: string,
  orgId: string,
): Promise<HousingLetterTemplate | null> {
  const supabase = getSupabaseAdminClient();

  // Try org-specific first
  const { data: orgTemplate } = await supabase
    .from("housing_letter_templates")
    .select("*")
    .eq("code", code)
    .eq("org_id", orgId)
    .maybeSingle();

  if (orgTemplate) {
    return {
      id: orgTemplate.id,
      code: orgTemplate.code,
      name: orgTemplate.name,
      description: orgTemplate.description,
      body: orgTemplate.body,
      variables: (orgTemplate.variables as string[]) ?? [],
    };
  }

  // Fall back to default
  const defaultTemplate = DEFAULT_HOUSING_TEMPLATES.find((t) => t.code === code);
  if (defaultTemplate) {
    return {
      id: `default-${code}`,
      ...defaultTemplate,
    };
  }

  return null;
}


/**
 * Render housing letter template with case data
 */
export async function renderHousingLetter(
  template: HousingLetterTemplate,
  caseData: {
    landlordName?: string;
    propertyAddress?: string;
    tenantName?: string;
    defectsList?: string;
    firstComplaintDate?: string;
    healthIssues?: string;
    previousLetterDate?: string;
    unfitStatus?: string;
    firmName?: string;
  },
): Promise<string> {
  let body = template.body;

  // Replace placeholders
  body = body.replace(/\{\{landlord_name\}\}/g, caseData.landlordName ?? "[Landlord Name]");
  body = body.replace(
    /\{\{property_address\}\}/g,
    caseData.propertyAddress ?? "[Property Address]",
  );
  body = body.replace(/\{\{tenant_name\}\}/g, caseData.tenantName ?? "[Tenant Name]");
  body = body.replace(/\{\{defects_list\}\}/g, caseData.defectsList ?? "[List of defects]");
  body = body.replace(
    /\{\{first_complaint_date\}\}/g,
    caseData.firstComplaintDate ?? "[Date]",
  );
  body = body.replace(/\{\{health_issues\}\}/g, caseData.healthIssues ?? "[Health issues]");
  body = body.replace(
    /\{\{previous_letter_date\}\}/g,
    caseData.previousLetterDate ?? "[Date]",
  );
  body = body.replace(/\{\{unfit_status\}\}/g, caseData.unfitStatus ?? "in disrepair");
  body = body.replace(/\{\{firm_name\}\}/g, caseData.firmName ?? "[Your Firm]");

  return body;
}

