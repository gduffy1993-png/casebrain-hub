import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { orgId } = await requireAuthContext();
  const body = await request.json();
  const documentId = body?.documentId as string | undefined;
  const caseId = body?.caseId as string | undefined;

  if (!documentId || !caseId) {
    return NextResponse.json(
      { error: "documentId and caseId are required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  const { data: caseRecord } = await supabase
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!caseRecord) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("documents")
    .update({ case_id: caseId })
    .eq("id", documentId)
    .eq("org_id", orgId)
    .is("case_id", null);

  if (error) {
    return NextResponse.json(
      { error: "Failed to attach document" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

