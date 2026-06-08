import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EVAL_PACK_IDS,
  evalPackNameForStorage,
  inferEvalPackFromTitle,
  parseEvalPackId,
  type EvalPackId,
} from "@/lib/eval-packs";

const PAGE_SIZE = 1000;

export type EvalPackCountRow = {
  tagged: number;
  inferredOnly: number;
  name: string;
};

export type EvalPackCaseRow = {
  id: string;
  title: string | null;
  eval_pack_id: string | null;
  eval_pack_name: string | null;
  eval_case_no: number | null;
};

function emptyCounts(): Record<EvalPackId, EvalPackCountRow> {
  const out = {} as Record<EvalPackId, EvalPackCountRow>;
  for (const id of EVAL_PACK_IDS) {
    out[id] = { tagged: 0, inferredOnly: 0, name: evalPackNameForStorage(id) };
  }
  return out;
}

/** Paginated aggregate of tagged + title-inferred-only counts per pack. */
export async function aggregateEvalPackCounts(
  supabase: SupabaseClient,
  orgId: string
): Promise<Record<EvalPackId, EvalPackCountRow>> {
  const counts = emptyCounts();
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("cases")
      .select("eval_pack_id, title")
      .eq("org_id", orgId)
      .eq("is_archived", false)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) break;

    for (const row of rows) {
      const tagged = parseEvalPackId((row as { eval_pack_id?: string | null }).eval_pack_id);
      if (tagged) {
        counts[tagged].tagged += 1;
        continue;
      }
      const inferred = inferEvalPackFromTitle(String((row as { title?: string | null }).title ?? ""));
      if (inferred) counts[inferred.pack_id].inferredOnly += 1;
    }

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return counts;
}

/** All non-archived cases explicitly tagged with eval_pack_id (paginated). */
export async function fetchTaggedCasesForPacks(
  supabase: SupabaseClient,
  orgId: string,
  packIds: EvalPackId[]
): Promise<EvalPackCaseRow[]> {
  if (packIds.length === 0) return [];
  const out: EvalPackCaseRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("cases")
      .select("id, title, eval_pack_id, eval_pack_name, eval_case_no")
      .eq("org_id", orgId)
      .eq("is_archived", false)
      .in("eval_pack_id", packIds)
      .order("eval_case_no", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as EvalPackCaseRow[];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return out;
}

export async function countTaggedCasesForPack(
  supabase: SupabaseClient,
  orgId: string,
  packId: EvalPackId
): Promise<number> {
  const { count, error } = await supabase
    .from("cases")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("eval_pack_id", packId)
    .eq("is_archived", false);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
