import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { HousingMeta } from "@/types/case";

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
      .select("tenant_vulnerability")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    // Extract health symptoms and vulnerability data
    const symptoms: string[] = [];
    const vulnerableOccupants: string[] = [];
    let respiratoryIssues = false;
    let childUnder5 = false;
    let enhancedDuty = false;

    // From housing case
    if (housingCase?.tenant_vulnerability) {
      for (const vuln of housingCase.tenant_vulnerability) {
        vulnerableOccupants.push(vuln);
        if (vuln.toLowerCase().includes("asthma") ||
            vuln.toLowerCase().includes("respiratory") ||
            vuln.toLowerCase().includes("breathing")) {
          respiratoryIssues = true;
          symptoms.push("Respiratory issues");
        }
        if (vuln.toLowerCase().includes("child") ||
            vuln.toLowerCase().includes("infant") ||
            vuln.toLowerCase().includes("toddler")) {
          childUnder5 = true;
        }
        if (vuln.toLowerCase().includes("elderly") ||
            vuln.toLowerCase().includes("pregnancy") ||
            vuln.toLowerCase().includes("disability")) {
          enhancedDuty = true;
        }
      }
    }

    // From documents
    for (const doc of documents ?? []) {
      if (doc.extracted_json && typeof doc.extracted_json === "object") {
        const extracted = doc.extracted_json as { 
          housingMeta?: HousingMeta;
          summary?: string;
        };
        const housingMeta = extracted.housingMeta;
        const summary = extracted.summary?.toLowerCase() ?? "";

        if (housingMeta?.tenantVulnerability) {
          for (const vuln of housingMeta.tenantVulnerability) {
            if (!vulnerableOccupants.includes(vuln)) {
              vulnerableOccupants.push(vuln);
            }
            if (vuln.toLowerCase().includes("asthma") ||
                vuln.toLowerCase().includes("respiratory")) {
              respiratoryIssues = true;
              if (!symptoms.includes("Respiratory issues")) {
                symptoms.push("Respiratory issues");
              }
            }
            if (vuln.toLowerCase().includes("child") ||
                vuln.toLowerCase().includes("infant")) {
              childUnder5 = true;
            }
          }
        }

        // Check summary for health symptoms
        if (summary.includes("asthma") && !symptoms.includes("Asthma")) {
          symptoms.push("Asthma");
          respiratoryIssues = true;
        }
        if (summary.includes("cough") && !symptoms.includes("Cough")) {
          symptoms.push("Cough");
        }
        if (summary.includes("wheez") && !symptoms.includes("Wheezing")) {
          symptoms.push("Wheezing");
          respiratoryIssues = true;
        }
        if (summary.includes("chest") && !symptoms.includes("Chest problems")) {
          symptoms.push("Chest problems");
        }
      }
    }

    const detected = symptoms.length > 0 || vulnerableOccupants.length > 0;
    let severity: "low" | "medium" | "high" | "critical" = "low";
    
    if (childUnder5 && respiratoryIssues) {
      severity = "critical";
    } else if (respiratoryIssues || childUnder5) {
      severity = "high";
    } else if (vulnerableOccupants.length > 0) {
      severity = "medium";
    }

    if (vulnerableOccupants.length > 0 || childUnder5) {
      enhancedDuty = true;
    }

    return NextResponse.json({
      data: {
        detected,
        symptoms,
        vulnerableOccupants,
        respiratoryIssues,
        childUnder5,
        enhancedDuty,
        severity,
      },
    });
  } catch (error) {
    console.error("[health-symptoms] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch health symptoms data" },
      { status: 500 }
    );
  }
}

