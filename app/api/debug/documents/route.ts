import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { orgId } = await requireAuthContext();
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");

    const supabase = getSupabaseAdminClient();

    if (caseId) {
      // Get documents for a specific case
      const { data: documents, error } = await supabase
        .from("documents")
        .select("id, name, case_id, org_id, created_at")
        .eq("case_id", caseId)
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        caseId,
        orgId,
        count: documents?.length ?? 0,
        documents: documents ?? [],
      });
    } else {
      // Get all documents for this org
      const { data: documents, error } = await supabase
        .from("documents")
        .select("id, name, case_id, org_id, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Group by case
      const byCase = (documents ?? []).reduce((acc, doc) => {
        const caseId = doc.case_id;
        if (!acc[caseId]) {
          acc[caseId] = [];
        }
        acc[caseId].push(doc);
        return acc;
      }, {} as Record<string, typeof documents>);

      return NextResponse.json({
        orgId,
        totalCount: documents?.length ?? 0,
        byCase,
        allDocuments: documents ?? [],
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

