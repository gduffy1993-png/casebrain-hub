import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { ExtractedCaseFacts, HousingMeta } from "@/types/case";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  try {
    // Fetch documents with extracted_json
    const { data: documents } = await supabase
      .from("documents")
      .select("id, name, extracted_json")
      .eq("case_id", caseId)
      .eq("org_id", orgId);

    // Fetch housing case
    const { data: housingCase } = await supabase
      .from("housing_cases")
      .select("first_report_date")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    // Extract damp/mould data from documents
    let detected = false;
    const indicators: string[] = [];
    const locations: string[] = [];
    let healthImpact = false;
    let category1Hazard = false;

    for (const doc of documents ?? []) {
      if (doc.extracted_json && typeof doc.extracted_json === "object") {
        const extracted = doc.extracted_json as { housingMeta?: HousingMeta };
        const housingMeta = extracted.housingMeta;

        if (housingMeta?.propertyDefects) {
          for (const defect of housingMeta.propertyDefects) {
            if (defect.type.toLowerCase().includes("mould") || 
                defect.type.toLowerCase().includes("mold") ||
                defect.type.toLowerCase().includes("damp")) {
              detected = true;
              if (defect.location && !locations.includes(defect.location)) {
                locations.push(defect.location);
              }
              if (defect.severity?.toLowerCase().includes("severe") || 
                  defect.severity?.toLowerCase().includes("critical")) {
                category1Hazard = true;
              }
            }
          }
        }

        if (housingMeta?.hhsrsHazards) {
          for (const hazard of housingMeta.hhsrsHazards) {
            if (hazard.toLowerCase().includes("damp") || 
                hazard.toLowerCase().includes("mould")) {
              detected = true;
              category1Hazard = true;
            }
          }
        }

        if (housingMeta?.tenantVulnerability) {
          for (const vuln of housingMeta.tenantVulnerability) {
            if (vuln.toLowerCase().includes("asthma") ||
                vuln.toLowerCase().includes("respiratory") ||
                vuln.toLowerCase().includes("breathing")) {
              healthImpact = true;
            }
          }
        }
      }
    }

    // Calculate days since first report
    let daysSinceFirstReport: number | undefined;
    if (housingCase?.first_report_date) {
      const firstReport = new Date(housingCase.first_report_date);
      const now = new Date();
      daysSinceFirstReport = Math.floor((now.getTime() - firstReport.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Determine severity
    let severity: "low" | "medium" | "high" | "critical" = "low";
    if (category1Hazard && healthImpact) {
      severity = "critical";
    } else if (category1Hazard || (daysSinceFirstReport && daysSinceFirstReport > 28)) {
      severity = "high";
    } else if (detected) {
      severity = "medium";
    }

    return NextResponse.json({
      data: {
        detected,
        severity,
        indicators: detected ? ["Damp/mould detected in property defects", "HHSRS hazard identified"] : [],
        daysSinceFirstReport,
        locations,
        healthImpact,
        category1Hazard,
      },
    });
  } catch (error) {
    console.error("[damp-mould] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch damp/mould data" },
      { status: 500 }
    );
  }
}

