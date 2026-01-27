/**
 * GET/POST /api/criminal/[caseId]/dependencies
 * 
 * Manage declared dependencies for a criminal case.
 * Solicitor-controlled: allows marking evidence items as required/helpful/not_needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { withPaywall } from "@/lib/paywall/protect-route";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

type DependencyItem = {
  id: string;
  label: string;
  status: "required" | "helpful" | "not_needed";
  note?: string;
  updated_at?: string;
  updated_by?: string;
};

type DependenciesRequest = {
  dependencies: DependencyItem[];
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    const { caseId } = await params;
    try {
      const authRes = await requireAuthContextApi();
      if (!authRes.ok) return authRes.response;
      const { userId, orgId } = authRes.context;

      const supabase = getSupabaseAdminClient();
      
      // Get case's org_id
      const { data: caseRow, error: caseError } = await supabase
        .from("cases")
        .select("id, org_id")
        .eq("id", caseId)
        .single();

      if (caseError || !caseRow || !caseRow.org_id) {
        return NextResponse.json({
          ok: false,
          error: "Case not found",
        }, { status: 404 });
      }

      // Get criminal case record
      const { data: criminalCase, error: criminalError } = await supabase
        .from("criminal_cases")
        .select("declared_dependencies")
        .eq("id", caseId)
        .eq("org_id", caseRow.org_id)
        .maybeSingle();

      if (criminalError) {
        console.error("Failed to fetch dependencies:", criminalError);
        return NextResponse.json({
          ok: false,
          error: "Failed to fetch dependencies",
          details: criminalError.message,
        }, { status: 500 });
      }

      // Return dependencies array (default to empty array)
      const dependencies = (criminalCase?.declared_dependencies as DependencyItem[]) || [];

      return NextResponse.json({
        ok: true,
        data: {
          dependencies,
        },
      });
    } catch (error) {
      console.error("Failed to fetch dependencies:", error);
      return NextResponse.json({
        ok: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    const { caseId } = await params;
    try {
      const authRes = await requireAuthContextApi();
      if (!authRes.ok) return authRes.response;
      const { userId, orgId } = authRes.context;

      const body: DependenciesRequest = await request.json();

      // Validate dependencies array
      if (!Array.isArray(body.dependencies)) {
        return NextResponse.json({
          ok: false,
          error: "dependencies must be an array",
        }, { status: 400 });
      }

      // Validate each dependency item
      const validStatuses = ["required", "helpful", "not_needed"];
      for (const dep of body.dependencies) {
        if (!dep.id || !dep.label || !dep.status) {
          return NextResponse.json({
            ok: false,
            error: "Each dependency must have id, label, and status",
          }, { status: 400 });
        }
        if (!validStatuses.includes(dep.status)) {
          return NextResponse.json({
            ok: false,
            error: `Invalid status: ${dep.status}. Must be one of: ${validStatuses.join(", ")}`,
          }, { status: 400 });
        }
      }

      const supabase = getSupabaseAdminClient();
      
      // Get case's org_id
      const { data: caseRow, error: caseError } = await supabase
        .from("cases")
        .select("id, org_id")
        .eq("id", caseId)
        .single();

      if (caseError || !caseRow || !caseRow.org_id) {
        return NextResponse.json({
          ok: false,
          error: "Case not found",
        }, { status: 404 });
      }

      // Add timestamps and user info to each dependency
      const now = new Date().toISOString();
      const dependenciesWithMetadata: DependencyItem[] = body.dependencies.map(dep => ({
        ...dep,
        updated_at: now,
        updated_by: userId,
      }));

      // Update or insert criminal case record
      const { data: existingCriminalCase } = await supabase
        .from("criminal_cases")
        .select("id")
        .eq("id", caseId)
        .eq("org_id", caseRow.org_id)
        .maybeSingle();

      if (existingCriminalCase) {
        // Update existing record
        const { data: updated, error: updateError } = await supabase
          .from("criminal_cases")
          .update({
            declared_dependencies: dependenciesWithMetadata,
            updated_at: now,
          })
          .eq("id", caseId)
          .eq("org_id", caseRow.org_id)
          .select("declared_dependencies")
          .single();

        if (updateError) {
          console.error("Failed to update dependencies:", updateError);
          return NextResponse.json({
            ok: false,
            error: "Failed to update dependencies",
            details: updateError.message,
          }, { status: 500 });
        }

        return NextResponse.json({
          ok: true,
          data: {
            dependencies: updated.declared_dependencies || [],
          },
        });
      } else {
        // Insert new record
        const { data: inserted, error: insertError } = await supabase
          .from("criminal_cases")
          .insert({
            id: caseId,
            org_id: caseRow.org_id,
            declared_dependencies: dependenciesWithMetadata,
          })
          .select("declared_dependencies")
          .single();

        if (insertError) {
          console.error("Failed to insert dependencies:", insertError);
          return NextResponse.json({
            ok: false,
            error: "Failed to save dependencies",
            details: insertError.message,
          }, { status: 500 });
        }

        return NextResponse.json({
          ok: true,
          data: {
            dependencies: inserted.declared_dependencies || [],
          },
        });
      }
    } catch (error) {
      console.error("Failed to save dependencies:", error);
      return NextResponse.json({
        ok: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }, { status: 500 });
    }
  });
}
