import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { createCustomReport, executeCustomReport } from "@/lib/reporting/custom-reports";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { orgId } = await requireAuthContext();
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("custom_reports")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error("Failed to fetch reports");
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("[Reports] Error fetching reports:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await requireAuthContext();
    const body = await request.json();

    const { name, description, dataSource, fields, filters, groupBy, chartType } = body;

    if (!name || !dataSource || !fields || !Array.isArray(fields)) {
      return NextResponse.json(
        { error: "name, dataSource, and fields (array) are required" },
        { status: 400 }
      );
    }

    const report = await createCustomReport(orgId, userId, {
      name,
      description,
      dataSource,
      fields,
      filters,
      groupBy,
      chartType,
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("[Reports] Error creating report:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create report" },
      { status: 500 }
    );
  }
}

