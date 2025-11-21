"use server";

/**
 * Bundle Checker - Risk scan of full housing bundle
 * 
 * Scans uploaded documents for:
 * - Missing surveyor report
 * - Missing hazard grading
 * - No medical evidence
 * - No disclosure pack
 * - No LBA (Letter Before Action)
 * - Late landlord response
 * - Expired limitation
 * - PI overlap indicators
 * - Missing disrepair schedule
 */

import { getSupabaseAdminClient } from "@/lib/supabase";
import { calculateLimitation } from "@/lib/core/limitation";
import type {
  BundleScanRecord,
  BundleScanItemRecord,
  BundleScanItemType,
  BundleScanRiskSeverity,
} from "@/types/bundle-scan";
import type { HousingCaseRecord } from "@/types/housing";

export type BundleScanInput = {
  caseId: string;
  orgId: string;
  userId: string;
};

export type BundleScanOutput = {
  scan: BundleScanRecord;
  items: BundleScanItemRecord[];
};

/**
 * Scan a housing case bundle for risks and missing items
 */
export async function scanHousingBundle(
  input: BundleScanInput,
): Promise<BundleScanOutput> {
  const supabase = getSupabaseAdminClient();

  // Fetch case and related data
  const [
    { data: caseRecord },
    { data: housingCase },
    { data: documents },
    { data: letters },
    { data: landlordResponses },
  ] = await Promise.all([
    supabase
      .from("cases")
      .select("id, title, practice_area, created_at")
      .eq("id", input.caseId)
      .eq("org_id", input.orgId)
      .maybeSingle(),
    supabase
      .from("housing_cases")
      .select("*")
      .eq("id", input.caseId)
      .eq("org_id", input.orgId)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("id, name, type, extracted_json, created_at")
      .eq("case_id", input.caseId)
      .eq("org_id", input.orgId),
    supabase
      .from("letters")
      .select("id, template_id, created_at")
      .eq("case_id", input.caseId),
    supabase
      .from("housing_landlord_responses")
      .select("id, response_date, response_type, created_at")
      .eq("case_id", input.caseId)
      .eq("org_id", input.orgId),
  ]);

  if (!caseRecord || !housingCase) {
    throw new Error("Case not found");
  }

  const items: Array<{
    item_type: BundleScanItemType;
    severity: BundleScanRiskSeverity;
    title: string;
    description: string | null;
    recommendation: string | null;
    document_reference: string | null;
  }> = [];

  // 1. Check for missing surveyor report
  const hasSurveyorReport = documents?.some(
    (doc) =>
      doc.name.toLowerCase().includes("survey") ||
      doc.name.toLowerCase().includes("inspection") ||
      doc.name.toLowerCase().includes("assessment") ||
      (doc.extracted_json as { summary?: string })?.summary?.toLowerCase().includes("surveyor"),
  );

  if (!hasSurveyorReport) {
    items.push({
      item_type: "missing_surveyor_report",
      severity: "high",
      title: "Missing Surveyor Report",
      description: "No surveyor or inspection report found in bundle. This is typically required for housing disrepair claims.",
      recommendation: "Obtain a professional surveyor report documenting the defects and their severity.",
      document_reference: null,
    });
  }

  // 2. Check for missing hazard grading (HHSRS)
  const hasHazardGrading =
    (housingCase.hhsrs_category_1_hazards?.length ?? 0) > 0 ||
    (housingCase.hhsrs_category_2_hazards?.length ?? 0) > 0 ||
    documents?.some(
      (doc) =>
        (doc.extracted_json as { summary?: string })?.summary?.toLowerCase().includes("hhsrs") ||
        (doc.extracted_json as { summary?: string })?.summary?.toLowerCase().includes("category 1") ||
        (doc.extracted_json as { summary?: string })?.summary?.toLowerCase().includes("category 2"),
    );

  if (!hasHazardGrading) {
    items.push({
      item_type: "missing_hazard_grading",
      severity: "high",
      title: "Missing HHSRS Hazard Grading",
      description: "No HHSRS Category 1 or Category 2 hazard classification found. This is important for establishing severity.",
      recommendation: "Obtain HHSRS assessment or ensure hazard categories are properly documented.",
      document_reference: null,
    });
  }

  // 3. Check for medical evidence
  const hasMedicalEvidence =
    documents?.some(
      (doc) =>
        doc.name.toLowerCase().includes("medical") ||
        doc.name.toLowerCase().includes("gp") ||
        doc.name.toLowerCase().includes("doctor") ||
        doc.name.toLowerCase().includes("health") ||
        (doc.extracted_json as { summary?: string })?.summary?.toLowerCase().includes("medical") ||
        (doc.extracted_json as { summary?: string })?.summary?.toLowerCase().includes("asthma") ||
        (doc.extracted_json as { summary?: string })?.summary?.toLowerCase().includes("respiratory"),
    ) || (housingCase.tenant_vulnerability?.length ?? 0) > 0;

  if (!hasMedicalEvidence) {
    items.push({
      item_type: "no_medical_evidence",
      severity: "medium",
      title: "No Medical Evidence",
      description: "No medical evidence found linking health issues to property defects. This may be required for special damages claims.",
      recommendation: "Obtain medical evidence (GP letters, hospital records) if tenant has health conditions affected by disrepair.",
      document_reference: null,
    });
  }

  // 4. Check for disclosure pack
  const hasDisclosurePack = documents?.some(
    (doc) =>
      doc.name.toLowerCase().includes("disclosure") ||
      doc.name.toLowerCase().includes("bundle") ||
      (doc.extracted_json as { summary?: string })?.summary?.toLowerCase().includes("disclosure"),
  );

  if (!hasDisclosurePack && (documents?.length ?? 0) < 5) {
    items.push({
      item_type: "no_disclosure",
      severity: "medium",
      title: "Incomplete Disclosure Pack",
      description: "Limited documents in bundle. A comprehensive disclosure pack should include correspondence, reports, and evidence.",
      recommendation: "Ensure all relevant documents are uploaded and properly indexed.",
      document_reference: null,
    });
  }

  // 5. Check for LBA (Letter Before Action)
  const hasLBA =
    letters?.some(
      (letter) =>
        letter.template_id?.toString().toLowerCase().includes("lba") ||
        letter.template_id?.toString().toLowerCase().includes("pre-action"),
    ) ||
    documents?.some(
      (doc) =>
        doc.name.toLowerCase().includes("lba") ||
        doc.name.toLowerCase().includes("letter before action") ||
        doc.name.toLowerCase().includes("pre-action"),
    );

  if (!hasLBA) {
    items.push({
      item_type: "no_lba",
      severity: "high",
      title: "No Letter Before Action (LBA)",
      description: "No Letter Before Action found. This is typically required before issuing proceedings.",
      recommendation: "Draft and send a Letter Before Action if not already done, or confirm it has been sent.",
      document_reference: null,
    });
  }

  // 6. Check for late landlord response
  if (housingCase.first_report_date) {
    const firstReportDate = new Date(housingCase.first_report_date);
    const daysSinceReport = Math.floor(
      (Date.now() - firstReportDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const hasRecentResponse = landlordResponses?.some((response) => {
      const responseDate = new Date(response.response_date);
      const daysSinceResponse = Math.floor(
        (Date.now() - responseDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      return daysSinceResponse <= 28;
    });

    if (!hasRecentResponse && daysSinceReport > 28) {
      items.push({
        item_type: "late_response",
        severity: daysSinceReport > 90 ? "high" : "medium",
        title: "Late or Missing Landlord Response",
        description: `No landlord response received within 28 days of first report. ${daysSinceReport} days have passed since first report.`,
        recommendation: "Consider sending a chaser letter or escalating to pre-action protocol stage.",
        document_reference: null,
      });
    }
  }

  // 7. Check for expired limitation
  const limitationResult = calculateLimitation({
    incidentDate: housingCase.first_report_date ?? undefined,
    dateOfKnowledge: housingCase.first_report_date ?? undefined,
    practiceArea: "housing",
  });

  if (limitationResult.limitationDate) {
    const limitationDate = new Date(limitationResult.limitationDate);
    const daysRemaining = Math.floor(
      (limitationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    if (daysRemaining < 0) {
      items.push({
        item_type: "expired_limitation",
        severity: "critical",
        title: "Limitation Period Expired",
        description: `Limitation period has expired. The limitation date was ${limitationDate.toLocaleDateString("en-GB")}.`,
        recommendation: "URGENT: Seek immediate legal advice. Consider standstill agreement or issuing proceedings immediately.",
        document_reference: null,
      });
    } else if (daysRemaining <= 90) {
      items.push({
        item_type: "expired_limitation",
        severity: "critical",
        title: "Limitation Period Approaching",
        description: `Limitation period expires in ${daysRemaining} days (${limitationDate.toLocaleDateString("en-GB")}).`,
        recommendation: "URGENT: Consider standstill agreement or issuing proceedings before limitation expires.",
        document_reference: null,
      });
    }
  }

  // 8. Check for PI overlap indicators
  const hasPIOverlap =
    caseRecord.practice_area === "pi" ||
    documents?.some(
      (doc) =>
        (doc.extracted_json as { summary?: string })?.summary?.toLowerCase().includes("personal injury") ||
        (doc.extracted_json as { summary?: string })?.summary?.toLowerCase().includes("accident") ||
        (doc.extracted_json as { summary?: string })?.summary?.toLowerCase().includes("injury"),
    );

  if (hasPIOverlap && caseRecord.practice_area === "housing_disrepair") {
    items.push({
      item_type: "pi_overlap",
      severity: "medium",
      title: "Potential PI Overlap Detected",
      description: "Documents suggest potential personal injury elements. This may require separate PI claim consideration.",
      recommendation: "Review whether a separate PI claim should be pursued alongside the housing disrepair claim.",
      document_reference: null,
    });
  }

  // 9. Check for missing disrepair schedule
  const hasSchedule =
    documents?.some(
      (doc) =>
        doc.name.toLowerCase().includes("schedule") ||
        doc.name.toLowerCase().includes("disrepair") ||
        (doc.extracted_json as { summary?: string })?.summary?.toLowerCase().includes("schedule of disrepair"),
    ) || (housingCase.hhsrs_category_1_hazards?.length ?? 0) > 0;

  if (!hasSchedule) {
    items.push({
      item_type: "missing_schedule",
      severity: "high",
      title: "Missing Schedule of Disrepair",
      description: "No formal schedule of disrepair found. This is typically required to document all defects.",
      recommendation: "Generate or obtain a comprehensive schedule of disrepair listing all defects, locations, and dates.",
      document_reference: null,
    });
  }

  // 10. Check for outdated reports
  if (documents && documents.length > 0) {
    const now = Date.now();
    const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;

    documents.forEach((doc) => {
      const docDate = new Date(doc.created_at).getTime();
      const isOutdated = docDate < sixMonthsAgo;
      const isReport =
        doc.name.toLowerCase().includes("report") ||
        doc.name.toLowerCase().includes("survey") ||
        doc.name.toLowerCase().includes("inspection");

      if (isOutdated && isReport) {
        items.push({
          item_type: "outdated_report",
          severity: "medium",
          title: `Outdated Report: ${doc.name}`,
          description: `Report dated ${new Date(doc.created_at).toLocaleDateString("en-GB")} may be outdated. Consider obtaining a fresh assessment.`,
          recommendation: "Review whether a more recent report is required, especially if defects have worsened.",
          document_reference: doc.id,
        });
      }
    });
  }

  // Calculate overall risk
  const criticalCount = items.filter((i) => i.severity === "critical").length;
  const highCount = items.filter((i) => i.severity === "high").length;
  const mediumCount = items.filter((i) => i.severity === "medium").length;

  let overallRisk: BundleScanRiskSeverity = "low";
  if (criticalCount > 0) {
    overallRisk = "critical";
  } else if (highCount >= 2 || highCount === 1 && mediumCount >= 2) {
    overallRisk = "high";
  } else if (highCount === 1 || mediumCount >= 3) {
    overallRisk = "medium";
  }

  // Create summary
  const summaryParts: string[] = [];
  if (criticalCount > 0) {
    summaryParts.push(`${criticalCount} critical issue(s)`);
  }
  if (highCount > 0) {
    summaryParts.push(`${highCount} high-priority issue(s)`);
  }
  if (mediumCount > 0) {
    summaryParts.push(`${mediumCount} medium-priority issue(s)`);
  }
  if (items.length === 0) {
    summaryParts.push("No issues detected");
  }

  const summary = summaryParts.length > 0
    ? `Bundle scan completed. ${summaryParts.join(", ")}. This is procedural guidance only and does not constitute legal advice.`
    : "Bundle scan completed with no issues detected.";

  // Save scan to database
  const { data: scanRecord, error: scanError } = await supabase
    .from("bundle_scan")
    .insert({
      case_id: input.caseId,
      org_id: input.orgId,
      scanned_by: input.userId,
      overall_risk: overallRisk,
      total_issues: items.length,
      summary,
    })
    .select("*")
    .maybeSingle();

  if (scanError || !scanRecord) {
    throw new Error("Failed to save bundle scan");
  }

  // Save scan items
  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from("bundle_scan_item")
      .insert(
        items.map((item) => ({
          scan_id: scanRecord.id,
          item_type: item.item_type,
          severity: item.severity,
          title: item.title,
          description: item.description,
          recommendation: item.recommendation,
          document_reference: item.document_reference,
        })),
      );

    if (itemsError) {
      console.error("[bundle-checker] Failed to save scan items", itemsError);
      // Continue even if items fail to save
    }
  }

  // Fetch saved items
  const { data: savedItems } = await supabase
    .from("bundle_scan_item")
    .select("*")
    .eq("scan_id", scanRecord.id)
    .order("severity", { ascending: false });

  return {
    scan: scanRecord,
    items: savedItems ?? [],
  };
}

/**
 * Get latest bundle scan for a case
 */
export async function getLatestBundleScan(
  caseId: string,
  orgId: string,
): Promise<BundleScanOutput | null> {
  const supabase = getSupabaseAdminClient();

  const { data: scanRecord } = await supabase
    .from("bundle_scan")
    .select("*")
    .eq("case_id", caseId)
    .eq("org_id", orgId)
    .order("scanned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!scanRecord) {
    return null;
  }

  const { data: items } = await supabase
    .from("bundle_scan_item")
    .select("*")
    .eq("scan_id", scanRecord.id)
    .order("severity", { ascending: false });

  return {
    scan: scanRecord,
    items: items ?? [],
  };
}

