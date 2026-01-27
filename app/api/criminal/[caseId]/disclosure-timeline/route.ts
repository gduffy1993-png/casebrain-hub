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

type DisclosureTimelineEntry = {
  id?: string;
  item: string;
  action: "requested" | "chased" | "served" | "reviewed" | "outstanding" | "overdue";
  date: string; // ISO date string
  note?: string;
  created_at?: string;
  created_by?: string;
};

type DisclosureTimelineRequest = {
  entries: DisclosureTimelineEntry[];
};

// Default overdue threshold: 14 days
const OVERDUE_THRESHOLD_DAYS = 14;

/**
 * Calculate if an entry should be marked as overdue
 */
function calculateOverdue(entry: DisclosureTimelineEntry): boolean {
  if (entry.action === "served" || entry.action === "reviewed") {
    return false; // Already served/reviewed, not overdue
  }

  const entryDate = new Date(entry.date);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysDiff >= OVERDUE_THRESHOLD_DAYS;
}

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

      // Get all timeline entries for this case
      const { data: entries, error: entriesError } = await supabase
        .from("criminal_disclosure_timeline")
        .select("*")
        .eq("case_id", caseId)
        .eq("org_id", caseRow.org_id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (entriesError) {
        console.error("Failed to fetch disclosure timeline:", entriesError);
        return NextResponse.json({
          ok: false,
          error: "Failed to fetch disclosure timeline",
          details: entriesError.message,
        }, { status: 500 });
      }

      // Process entries: mark overdue, group by item
      const processedEntries = (entries || []).map(entry => {
        const entryWithOverdue: DisclosureTimelineEntry = {
          id: entry.id,
          item: entry.item,
          action: entry.action,
          date: entry.date,
          note: entry.note,
          created_at: entry.created_at,
          created_by: entry.created_by,
        };

        // Auto-calculate overdue if requested/chased and > 14 days old
        if ((entry.action === "requested" || entry.action === "chased") && calculateOverdue(entryWithOverdue)) {
          entryWithOverdue.action = "overdue";
        }

        return entryWithOverdue;
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
      });
    } catch (error) {
      console.error("Failed to fetch disclosure timeline:", error);
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

      const body: DisclosureTimelineRequest = await request.json();

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

      // Insert new entries (upsert based on unique constraint)
      const insertPayloads = body.entries.map(entry => ({
        case_id: caseId,
        org_id: caseRow.org_id,
        item: entry.item,
        action: entry.action,
        date: entry.date,
        note: entry.note || null,
        created_by: userId,
      }));

      // Use upsert to handle duplicates (based on unique constraint)
      const { data: inserted, error: insertError } = await supabase
        .from("criminal_disclosure_timeline")
        .upsert(insertPayloads, {
          onConflict: "case_id,item,date,action",
          ignoreDuplicates: false,
        })
        .select();

      if (insertError) {
        console.error("Failed to save disclosure timeline:", insertError);
        return NextResponse.json({
          ok: false,
          error: "Failed to save disclosure timeline",
          details: insertError.message,
        }, { status: 500 });
      }

      // Fetch updated timeline
      const { data: entries } = await supabase
        .from("criminal_disclosure_timeline")
        .select("*")
        .eq("case_id", caseId)
        .eq("org_id", caseRow.org_id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      return NextResponse.json({
        ok: true,
        data: {
          entries: entries || [],
        },
      });
    } catch (error) {
      console.error("Failed to save disclosure timeline:", error);
      return NextResponse.json({
        ok: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }, { status: 500 });
    }
  });
}

/**
 * Generate court-safe disclosure note from timeline entries
 */
export async function generateDisclosureNote(entries: DisclosureTimelineEntry[]): Promise<string> {
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
