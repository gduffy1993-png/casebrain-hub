"use server";

import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateCaseBundlePdf } from "@/lib/pdf";
import { buildChronology } from "./timeline";

/**
 * Core Litigation Brain - Bundle / Disclosure Engine
 * 
 * Creates court-ready bundles with indexing and pagination.
 * Used by all case-type modules.
 */

export type BundleDocument = {
  id: string;
  name: string;
  type: string;
  uploadDate: Date;
  tags: string[];
  relevance: "high" | "medium" | "low";
  source: string;
};

export type BundleIndex = {
  section: string;
  documents: BundleDocument[];
  pageStart?: number;
};

export type BundleExport = {
  pdf: Buffer;
  index: BundleIndex[];
  totalPages: number;
};

/**
 * Prepare bundle with tagging and indexing
 */
export async function prepareBundle(
  caseId: string,
  orgId: string,
  options?: {
    includeChronology?: boolean;
    includeLetters?: boolean;
    includeRiskFlags?: boolean;
  },
): Promise<BundleExport> {
  const supabase = getSupabaseAdminClient();

  const [
    { data: caseRecord },
    { data: documents },
    { data: letters },
    { data: riskFlags },
    { data: firmSettings },
  ] = await Promise.all([
    supabase
      .from("cases")
      .select("id, title, summary, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("id, name, type, created_at, extracted_json")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true }),
    options?.includeLetters
      ? supabase
          .from("letters")
          .select("id, body, version, created_by, updated_at, template_id")
          .eq("case_id", caseId)
          .order("version", { ascending: false })
      : { data: null },
    options?.includeRiskFlags
      ? supabase
          .from("risk_flags")
          .select("id, flag_type, severity, description, detected_at, resolved")
          .eq("case_id", caseId)
          .eq("resolved", false)
      : { data: null },
    supabase
      .from("organisation_settings")
      .select("firm_name, firm_address, default_sign_off")
      .eq("org_id", orgId)
      .maybeSingle(),
  ]);

  if (!caseRecord) {
    throw new Error("Case not found");
  }

  // Build chronology if requested
  const chronology = options?.includeChronology
    ? await buildChronology(caseId, orgId)
    : [];

  // Tag documents by relevance
  const bundleDocuments: BundleDocument[] =
    documents?.map((doc) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type ?? "Unknown",
      uploadDate: new Date(doc.created_at),
      tags: extractDocumentTags(doc.extracted_json),
      relevance: assessRelevance(doc.extracted_json),
      source: "uploaded",
    })) ?? [];

  // Generate PDF bundle
  const pdf = await generateCaseBundlePdf({
    caseTitle: caseRecord.title,
    caseId: caseRecord.id,
    generatedBy: "CaseBrain",
    generatedAt: new Date(),
    summary: caseRecord.summary ?? "No summary available.",
    firmName: firmSettings?.firm_name ?? "Your firm",
    firmAddress: firmSettings?.firm_address ?? "",
    defaultSignOff: firmSettings?.default_sign_off ?? "",
    timeline: chronology.map((e) => ({
      id: e.id,
      date: e.date.toISOString(),
      label: e.event,
      description: e.issueSignificance ?? "",
      source: e.source.type as "document" | "user" | "system" | "email",
    })),
    letters:
      letters?.map((l) => ({
        title: `Letter v${l.version}`,
        version: l.version,
        author: l.created_by ?? "CaseBrain",
        body: l.body,
        updatedAt: l.updated_at ?? "",
        date: l.updated_at ?? new Date().toISOString(),
      })) ?? [],
    documents: bundleDocuments.map((d) => ({
      name: d.name,
      summary: "",
      type: d.type,
      uploadDate: d.uploadDate.toISOString(),
    })),
    riskFlags:
      riskFlags?.map((f) => ({
        type: f.flag_type,
        severity: f.severity,
        description: f.description,
        detectedAt: f.detected_at,
        resolved: f.resolved,
      })) ?? [],
  });

  // Build index
  const index: BundleIndex[] = [
    {
      section: "Chronology",
      documents: [],
      pageStart: 1,
    },
    {
      section: "Letters",
      documents: [],
      pageStart: 2,
    },
    {
      section: "Documents",
      documents: bundleDocuments,
    },
  ];

  return {
    pdf,
    index,
    totalPages: Math.ceil(pdf.length / 1024), // Approximate
  };
}

function extractDocumentTags(extracted: unknown): string[] {
  const tags: string[] = [];
  const data = extracted as { claimType?: string; keyIssues?: string[] } | null;

  if (data?.claimType) {
    tags.push(data.claimType);
  }
  if (data?.keyIssues) {
    tags.push(...data.keyIssues);
  }

  return tags;
}

function assessRelevance(extracted: unknown): "high" | "medium" | "low" {
  const data = extracted as
    | { parties?: unknown[]; dates?: unknown[]; amounts?: unknown[] }
    | null;

  if (!data) return "low";

  const hasParties = (data.parties?.length ?? 0) > 0;
  const hasDates = (data.dates?.length ?? 0) > 0;
  const hasAmounts = (data.amounts?.length ?? 0) > 0;

  if (hasParties && hasDates && hasAmounts) return "high";
  if (hasParties || hasDates) return "medium";
  return "low";
}

/**
 * Generate disclosure list
 */
export async function generateDisclosureList(
  caseId: string,
  orgId: string,
): Promise<Array<{ document: string; description: string; relevance: string }>> {
  const supabase = getSupabaseAdminClient();

  const { data: documents } = await supabase
    .from("documents")
    .select("id, name, extracted_json")
    .eq("case_id", caseId);

  return (
    documents?.map((doc) => ({
      document: doc.name,
      description: (doc.extracted_json as { summary?: string })?.summary ?? "",
      relevance: assessRelevance(doc.extracted_json),
    })) ?? []
  );
}

