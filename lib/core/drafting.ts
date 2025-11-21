"use server";

import { getSupabaseAdminClient } from "@/lib/supabase";
import type { ExtractedCaseFacts } from "@/types";

/**
 * Core Litigation Brain - Drafting Generator
 * 
 * Auto-populates templates with extracted facts.
 * Supports case-type specific templates via module system.
 */

export type TemplateVariable = {
  name: string;
  value: string;
  source?: string; // Evidence source
  confidence: "high" | "medium" | "low";
};

export type DraftResult = {
  body: string;
  variables: TemplateVariable[];
  missingVariables: string[];
  confidence: "high" | "medium" | "low";
  disclaimer: string;
};

/**
 * Extract variables from case facts for template population
 */
export function extractTemplateVariables(
  facts: ExtractedCaseFacts,
  templateVariables: string[],
): Map<string, TemplateVariable> {
  const variables = new Map<string, TemplateVariable>();

  // Extract common variables
  if (templateVariables.includes("client") || templateVariables.includes("claimant")) {
    const client = facts.parties.find(
      (p) => p.role === "client" || p.role === "claimant",
    );
    if (client) {
      variables.set("client", {
        name: "client",
        value: client.name,
        source: client.reference ?? undefined,
        confidence: "high",
      });
    }
  }

  if (templateVariables.includes("defendant") || templateVariables.includes("opponent")) {
    const defendant = facts.parties.find(
      (p) => p.role === "defendant" || p.role === "opponent",
    );
    if (defendant) {
      variables.set("defendant", {
        name: "defendant",
        value: defendant.name,
        source: defendant.reference ?? undefined,
        confidence: "high",
      });
    }
  }

  if (templateVariables.includes("incident_date") || templateVariables.includes("accident_date")) {
    const incidentDate = facts.dates.find(
      (d) =>
        d.label.toLowerCase().includes("accident") ||
        d.label.toLowerCase().includes("incident") ||
        d.label.toLowerCase().includes("event"),
    );
    if (incidentDate) {
      variables.set("incident_date", {
        name: "incident_date",
        value: new Date(incidentDate.isoDate).toLocaleDateString("en-GB"),
        source: incidentDate.label,
        confidence: "high",
      });
    }
  }

  if (templateVariables.includes("summary") || templateVariables.includes("facts")) {
    variables.set("summary", {
      name: "summary",
      value: facts.summary,
      source: "extracted_summary",
      confidence: facts.summary.length > 50 ? "high" : "medium",
    });
  }

  return variables;
}

/**
 * Render template with variables
 */
export function renderTemplate(
  templateBody: string,
  variables: Map<string, TemplateVariable>,
): DraftResult {
  let body = templateBody;
  const usedVariables: TemplateVariable[] = [];
  const missingVariables: string[] = [];

  // Find all placeholders in template
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  const matches = Array.from(templateBody.matchAll(placeholderRegex));
  const requiredVars = new Set(matches.map((m) => m[1]));

  // Replace placeholders
  requiredVars.forEach((varName) => {
    const variable = variables.get(varName);
    if (variable) {
      body = body.replace(new RegExp(`\\{\\{${varName}\\}\\}`, "g"), variable.value);
      usedVariables.push(variable);
    } else {
      body = body.replace(
        new RegExp(`\\{\\{${varName}\\}\\}`, "g"),
        `[${varName} - not found in evidence]`,
      );
      missingVariables.push(varName);
    }
  });

  const confidence =
    missingVariables.length === 0
      ? "high"
      : missingVariables.length < requiredVars.size / 2
        ? "medium"
        : "low";

  return {
    body,
    variables: usedVariables,
    missingVariables,
    confidence,
    disclaimer:
      "This draft is auto-generated from extracted evidence. Review all facts and verify accuracy before sending. Missing variables indicate data not found in uploaded documents.",
  };
}

/**
 * Get template by code (supports case-type specific templates)
 */
export async function getTemplate(
  templateCode: string,
  orgId: string,
  practiceArea?: string,
): Promise<{ body: string; variables: string[] } | null> {
  const supabase = getSupabaseAdminClient();

  // Try case-type specific template first
  if (practiceArea === "housing_disrepair") {
    const { data: housingTemplate } = await supabase
      .from("housing_letter_templates")
      .select("body, variables")
      .eq("code", templateCode)
      .or(`org_id.eq.${orgId},org_id.is.null`)
      .order("org_id", { ascending: false }) // Prefer org-specific
      .maybeSingle();

    if (housingTemplate) {
      return {
        body: housingTemplate.body,
        variables: (housingTemplate.variables as string[]) ?? [],
      };
    }
  }

  if (practiceArea === "pi" || practiceArea === "clinical_negligence") {
    const { data: piTemplate } = await supabase
      .from("pi_letter_templates")
      .select("body, variables")
      .eq("code", templateCode)
      .or(`org_id.eq.${orgId},org_id.is.null`)
      .order("org_id", { ascending: false })
      .maybeSingle();

    if (piTemplate) {
      return {
        body: piTemplate.body,
        variables: (piTemplate.variables as string[]) ?? [],
      };
    }
  }

  // Fall back to general templates
  const { data: generalTemplate } = await supabase
    .from("letterTemplates")
    .select("body_template, variables")
    .eq("name", templateCode)
    .or(`org_id.eq.${orgId},org_id.is.null`)
    .order("org_id", { ascending: false })
    .maybeSingle();

  if (generalTemplate) {
    return {
      body: generalTemplate.body_template,
      variables: (generalTemplate.variables as string[]) ?? [],
    };
  }

  return null;
}

