import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { CaseNote } from "@/lib/types/casebrain";

type RouteParams = {
  params: { caseId: string };
};

/**
 * GET /api/cases/[caseId]/notes - List notes for a case
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = params;
    const supabase = getSupabaseAdminClient();

    // Verify case belongs to org
    const { data: caseRecord, error: caseError } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (caseError || !caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Fetch notes
    const { data: notes, error } = await supabase
      .from("case_notes")
      .select("*")
      .eq("case_id", caseId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      // Table might not exist yet - return empty array
      if (error.code === "42P01") {
        return NextResponse.json({ notes: [] });
      }
      throw error;
    }

    // Transform to CaseNote type
    const formattedNotes: CaseNote[] = (notes ?? []).map((n) => ({
      id: n.id,
      caseId: n.case_id,
      orgId: n.org_id,
      content: n.content,
      createdBy: n.created_by,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
      isPinned: n.is_pinned ?? false,
    }));

    return NextResponse.json({ notes: formattedNotes });
  } catch (error) {
    console.error("Failed to fetch case notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cases/[caseId]/notes - Create a new note
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, userId } = await requireAuthContext();
    const { caseId } = params;
    const supabase = getSupabaseAdminClient();

    // Verify case belongs to org
    const { data: caseRecord, error: caseError } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (caseError || !caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const body = await request.json();
    const { content, isPinned = false } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    const { data: note, error } = await supabase
      .from("case_notes")
      .insert({
        case_id: caseId,
        org_id: orgId,
        content: content.trim(),
        created_by: userId,
        is_pinned: isPinned,
      })
      .select("*")
      .single();

    if (error) {
      // If table doesn't exist, return a helpful error
      if (error.code === "42P01") {
        return NextResponse.json(
          { error: "Case notes table not yet created. Run migrations." },
          { status: 500 },
        );
      }
      throw error;
    }

    const formattedNote: CaseNote = {
      id: note.id,
      caseId: note.case_id,
      orgId: note.org_id,
      content: note.content,
      createdBy: note.created_by,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      isPinned: note.is_pinned ?? false,
    };

    return NextResponse.json({ note: formattedNote }, { status: 201 });
  } catch (error) {
    console.error("Failed to create case note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 },
    );
  }
}

