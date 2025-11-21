import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();
  const url = new URL(request.url);
  const caseId = url.searchParams.get("caseId") ?? undefined;

  let entitiesQuery = supabase
    .from("entities")
    .select("id, label, type, metadata, case_id, cases(title)")
    .eq("org_id", orgId)
    .limit(100);

  if (caseId) {
    entitiesQuery = entitiesQuery.eq("case_id", caseId);
  }

  const { data: entities, error } = await entitiesQuery;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: links } = await supabase
    .from("entity_links")
    .select("source_entity, target_entity, relationship")
    .eq("org_id", orgId)
    .limit(200);

  return NextResponse.json({ entities, links: links ?? [] });
}

