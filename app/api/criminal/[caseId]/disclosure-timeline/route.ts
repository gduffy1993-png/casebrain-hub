/**
 * GET/POST /api/criminal/[caseId]/disclosure-timeline
 * 
 * Manage disclosure chase timeline for a criminal case.
 * Tracks requests, chases, served status, and generates court-safe notes.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { withPaywall } from "@/lib/paywall/protect-route";
import { getSupabaseAdminClient } from "@/lib/supabase";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

// DB schema type (matches actual table columns)
type DisclosureTimelineEntryDB = {
  id: string;
  case_id: string;
  item: string;
  action: "requested" | "chased" | "served" | "reviewed" | "outstanding" | "overdue";
  action_date: string; // ISO date string (DB column name is 'action_date')
  note: string | null;
  created_at: string | null;
};

// API response type (mapped for UI compatibility)
type DisclosureTimelineEntry = {
  id?: string;
  item: string;
  action: "requested" | "chased" | "served" | "reviewed" | "outstanding" | "overdue";
  date: string; // Mapped from DB action_date for UI compatibility
  note?: string;
  created_at?: string;
};

type DisclosureTimelineRequest = {
  entries: DisclosureTimelineEntry[];
};

// Default overdue threshold: 14 days
const OVERDUE_THRESHOLD_DAYS = 14;

/**
 * Calculate if an entry should be marked as overdue
 */
function calculateOverdue(date: string, action: string): boolean {
  if (action === "served" || action === "reviewed") {
    return false; // Already served/reviewed, not overdue
  }

  const entryDate = new Date(date);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysDiff >= OVERDUE_THRESHOLD_DAYS;
}

/**
 * Map DB entry to API response format
 */
function mapDBEntryToAPI(entry: DisclosureTimelineEntryDB): DisclosureTimelineEntry {
  return {
    id: entry.id,
    item: entry.item,
    action: entry.action,
    date: entry.action_date, // Map action_date -> date for UI compatibility
    note: entry.note || undefined,
    created_at: entry.created_at || undefined,
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    try {
      const { caseId } = await params;
      
      // Validate caseId
      if (!caseId || typeof caseId !== "string") {
        return NextResponse.json({
          ok: false,
          error: "Invalid case ID",
        }, { status: 400 });
      }

      const authRes = await requireAuthContextApi();
      if (!authRes.ok) return authRes.response;
      const { userId, orgId } = authRes.context;

      const supabase = getSupabaseAdminClient();
      
      // Get case's org_id - use maybeSingle() to avoid throwing on no rows
      const { data: caseRow, error: caseError } = await supabase
        .from("cases")
        .select("id, org_id")
        .eq("id", caseId)
        .maybeSingle();

      if (caseError) {
        console.error("[disclosure-timeline GET] Supabase error fetching case:", {
          message: caseError.message,
          code: caseError.code,
          details: caseError.details,
          hint: caseError.hint,
          caseId,
        });
        return NextResponse.json({
          ok: false,
          error: "Failed to fetch case",
        }, { status: 500 });
      }

      if (!caseRow || !caseRow.org_id) {
        return NextResponse.json({
          ok: false,
          error: "Case not found",
        }, { status: 404 });
      }

      // Verify org access
      if (caseRow.org_id !== orgId) {
        return NextResponse.json({
          ok: false,
          error: "Case not found",
        }, { status: 404 });
      }

      // Get all timeline entries for this case - select only existing columns
      // DB schema: id, case_id, org_id, item, action, action_date, note, created_at, created_by
      const { data: entries, error: entriesError } = await supabase
        .from("criminal_disclosure_timeline")
        .select("id, case_id, item, action, action_date, note, created_at")
        .eq("case_id", caseId)
        .eq("org_id", caseRow.org_id)
        .order("action_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (entriesError) {
        console.error("[disclosure-timeline GET] Supabase error fetching entries:", {
          message: entriesError.message,
          code: entriesError.code,
          details: entriesError.details,
          hint: entriesError.hint,
          caseId,
        });
        return NextResponse.json({
          ok: false,
          error: "Failed to fetch disclosure timeline",
        }, { status: 500 });
      }

      // Return empty array if no entries (not an error) - always return 200
      if (!entries || entries.length === 0) {
        return NextResponse.json({
          ok: true,
          data: {
            entries: [],
            itemsStatus: [],
          },
        }, { status: 200 });
      }

      // Process entries: map DB format to API format, mark overdue
      const processedEntries = entries.map(entry => {
        const apiEntry = mapDBEntryToAPI(entry);

        // Auto-calculate overdue if requested/chased and > 14 days old
        if ((entry.action === "requested" || entry.action === "chased") && calculateOverdue(entry.action_date, entry.action)) {
          apiEntry.action = "overdue";
        }

        return apiEntry;
      });

      // Group by item to get latest status per item
      const itemsMap = new Map<string, DisclosureTimelineEntry>();
      for (const entry of processedEntries) {
        const existing = itemsMap.get(entry.item);
        if (!existing || new Date(entry.date) > new Date(existing.date)) {
          itemsMap.set(entry.item, entry);
        }
      }

      return NextResponse.json({
        ok: true,
        data: {
          entries: processedEntries,
          itemsStatus: Array.from(itemsMap.values()),
        },
      }, { status: 200 });
    } catch (error) {
      console.error("[disclosure-timeline GET] Unexpected error:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return NextResponse.json({
        ok: false,
        error: "Internal server error",
      }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  return await withPaywall("analysis", async () => {
    try {
      const { caseId } = await params;
      
      // Validate caseId
      if (!caseId || typeof caseId !== "string") {
        return NextResponse.json({
          ok: false,
          error: "Invalid case ID",
        }, { status: 400 });
      }

      const authRes = await requireAuthContextApi();
      if (!authRes.ok) return authRes.response;
      const { userId, orgId } = authRes.context;

      let body: DisclosureTimelineRequest;
      try {
        body = await request.json();
      } catch (parseError) {
        return NextResponse.json({
          ok: false,
          error: "Invalid JSON body",
        }, { status: 400 });
      }

      // Validate entries array
      if (!Array.isArray(body.entries)) {
        return NextResponse.json({
          ok: false,
          error: "entries must be an array",
        }, { status: 400 });
      }

      // Validate each entry
      const validActions = ["requested", "chased", "served", "reviewed", "outstanding", "overdue"];
      for (const entry of body.entries) {
        if (!entry.item || !entry.action || !entry.date) {
          return NextResponse.json({
            ok: false,
            error: "Each entry must have item, action, and date",
          }, { status: 400 });
        }
        if (!validActions.includes(entry.action)) {
          return NextResponse.json({
            ok: false,
            error: `Invalid action: ${entry.action}. Must be one of: ${validActions.join(", ")}`,
          }, { status: 400 });
        }
        // Validate ISO date format
        const dateObj = new Date(entry.date);
        if (isNaN(dateObj.getTime())) {
          return NextResponse.json({
            ok: false,
            error: `Invalid date format: ${entry.date}. Must be ISO date string (YYYY-MM-DD)`,
          }, { status: 400 });
        }
      }

      const supabase = getSupabaseAdminClient();
      
      // Get case's org_id - use maybeSingle() to avoid throwing on no rows
      const { data: caseRow, error: caseError } = await supabase
        .from("cases")
        .select("id, org_id")
        .eq("id", caseId)
        .maybeSingle();

      if (caseError) {
        console.error("[disclosure-timeline POST] Supabase error fetching case:", {
          message: caseError.message,
          code: caseError.code,
          details: caseError.details,
          hint: caseError.hint,
          caseId,
        });
        return NextResponse.json({
          ok: false,
          error: "Failed to fetch case",
        }, { status: 500 });
      }

      if (!caseRow || !caseRow.org_id) {
        return NextResponse.json({
          ok: false,
          error: "Case not found",
        }, { status: 404 });
      }

      // Verify org access
      if (caseRow.org_id !== orgId) {
        return NextResponse.json({
          ok: false,
          error: "Case not found",
        }, { status: 404 });
      }

      // Insert new entries - use DB column names (DB uses 'action_date')
      const insertPayloads = body.entries.map(entry => ({
        case_id: caseId,
        org_id: caseRow.org_id,
        item: entry.item,
        action: entry.action,
        action_date: entry.date, // Map date -> action_date for DB
        note: entry.note || null,
      }));

      // Use upsert to handle duplicates (based on unique constraint)
      // Note: unique constraint is on case_id, item, action_date, action
      const { data: inserted, error: insertError } = await supabase
        .from("criminal_disclosure_timeline")
        .upsert(insertPayloads, {
          onConflict: "case_id,item,action_date,action", // Match actual constraint
          ignoreDuplicates: false,
        })
        .select("id, case_id, item, action, action_date, note, created_at");

      if (insertError) {
        console.error("[disclosure-timeline POST] Supabase error inserting entries:", {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
          caseId,
        });
        return NextResponse.json({
          ok: false,
          error: "Failed to save disclosure timeline",
        }, { status: 500 });
      }

      // Fetch updated timeline - select only existing columns (DB uses 'action_date')
      const { data: entries, error: fetchError } = await supabase
        .from("criminal_disclosure_timeline")
        .select("id, case_id, item, action, action_date, note, created_at")
        .eq("case_id", caseId)
        .eq("org_id", caseRow.org_id)
        .order("action_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("[disclosure-timeline POST] Supabase error fetching updated timeline:", {
          message: fetchError.message,
          code: fetchError.code,
          details: fetchError.details,
          hint: fetchError.hint,
          caseId,
        });
        return NextResponse.json({
          ok: false,
          error: "Failed to fetch updated timeline",
        }, { status: 500 });
      }

      // Map DB entries to API format
      const mappedEntries = (entries || []).map(mapDBEntryToAPI);

      return NextResponse.json({
        ok: true,
        data: {
          entries: mappedEntries,
        },
      }, { status: 200 });
    } catch (error) {
      console.error("[disclosure-timeline POST] Unexpected error:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return NextResponse.json({
        ok: false,
        error: "Internal server error",
      }, { status: 500 });
    }
  });
}

/**
 * Generate court-safe disclosure note from timeline entries
 * (Internal helper function, not exported)
 */
async function generateDisclosureNote(entries: DisclosureTimelineEntry[]): Promise<string> {
  // Group by item and get latest status
  const itemsMap = new Map<string, DisclosureTimelineEntry>();
  for (const entry of entries) {
    const existing = itemsMap.get(entry.item);
    if (!existing || new Date(entry.date) > new Date(existing.date)) {
      itemsMap.set(entry.item, entry);
    }
  }

  // Filter to outstanding/overdue items
  const outstandingItems = Array.from(itemsMap.values())
    .filter(entry => entry.action === "outstanding" || entry.action === "overdue" || entry.action === "requested" || entry.action === "chased")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (outstandingItems.length === 0) {
    return "All requested disclosure items have been served and reviewed.";
  }

  // Build note
  const lines: string[] = [];
  lines.push("Outstanding disclosure items:");
  
  for (const item of outstandingItems) {
    const lastAction = item.action === "overdue" ? "overdue" : item.action;
    const lastDate = new Date(item.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    lines.push(`- ${item.item}: ${lastAction} (last action: ${lastDate})`);
  }

  return lines.join("\n");
}
