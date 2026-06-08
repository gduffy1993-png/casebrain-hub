/**
 * D5 follow-on: Build a "change list" string from recent verdict ratings that have notes.
 * Used to feed into chat and propose-summary context so the model can adapt to user feedback.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_ITEMS = 10;
const MAX_NOTE_LENGTH = 300;

export async function getChangeListForContext(
  supabase: SupabaseClient,
  caseId: string,
  orgId: string
): Promise<string> {
  const { data: rows } = await supabase
    .from("criminal_verdict_ratings")
    .select("target, rating, note, created_at")
    .eq("case_id", caseId)
    .eq("org_id", orgId)
    .not("note", "is", null)
    .order("created_at", { ascending: false })
    .limit(MAX_ITEMS);

  if (!rows || rows.length === 0) return "";

  const lines = (rows as { target: string; rating: string; note: string | null; created_at: string }[])
    .filter((r) => r.note && r.note.trim())
    .map((r) => {
      const date = r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
      const note = (r.note ?? "").trim().slice(0, MAX_NOTE_LENGTH);
      return `- ${r.target} (${r.rating}${date ? `, ${date}` : ""}): ${note}`;
    });

  if (lines.length === 0) return "";
  return `User feedback / change list (address where relevant):\n${lines.join("\n")}`;
}
