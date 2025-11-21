import "server-only";

import { getSupabaseAdminClient } from "./supabase";

type SearchResult = {
  id: string;
  type: "case" | "document" | "letter";
  title: string;
  snippet: string;
  updated_at: string;
  caseId?: string;
};

export async function globalSearch(query: string, orgId: string) {
  if (!query.trim()) {
    return [];
  }

  const supabase = getSupabaseAdminClient();

  const [cases, documents, letters] = await Promise.all([
    supabase
      .from("cases")
      .select("id, title, summary, updated_at")
      .eq("org_id", orgId)
      .ilike("title", `%${query}%`)
      .limit(5),
    supabase
      .from("documents")
      .select(
        "id, name, uploaded_by, created_at, case_id, cases!inner(org_id)",
      )
      .ilike("name", `%${query}%`)
      .eq("cases.org_id", orgId)
      .limit(5),
    supabase
      .from("letters")
      .select("id, case_id, body, version, updated_at, cases!inner(org_id)")
      .ilike("body", `%${query}%`)
      .eq("cases.org_id", orgId)
      .limit(5),
  ]);

  if (cases.error || documents.error || letters.error) {
    throw cases.error ?? documents.error ?? letters.error;
  }

  const results: SearchResult[] = [
    ...(cases.data ?? []).map((row) => ({
      id: row.id,
      type: "case" as const,
      title: row.title,
      snippet: row.summary,
      updated_at: row.updated_at,
    })),
    ...(documents.data ?? []).map((row) => ({
      id: row.id,
      type: "document" as const,
      title: row.name,
      snippet: `Uploaded by ${row.uploaded_by}`,
      updated_at: row.created_at,
      caseId: row.case_id,
    })),
    ...(letters.data ?? []).map((row) => ({
      id: row.id,
      type: "letter" as const,
      title: `Letter v${row.version}`,
      snippet: row.body.slice(0, 140),
      updated_at: row.updated_at,
      caseId: row.case_id,
    })),
  ];

  return results;
}

