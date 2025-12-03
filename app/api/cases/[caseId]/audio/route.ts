import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { CaseCallRecord, AttendanceNote } from "@/lib/types/casebrain";

type RouteParams = {
  params: { caseId: string };
};

/**
 * GET /api/cases/[caseId]/audio - List audio records for a case
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

    // Fetch call records
    const { data: calls, error: callsError } = await supabase
      .from("case_calls")
      .select("*")
      .eq("case_id", caseId)
      .order("call_date", { ascending: false });

    if (callsError) {
      // Table might not exist yet
      if (callsError.code === "42P01") {
        return NextResponse.json({ calls: [], notes: [] });
      }
      throw callsError;
    }

    // Fetch attendance notes
    const { data: notes, error: notesError } = await supabase
      .from("attendance_notes")
      .select("*")
      .eq("case_id", caseId)
      .order("note_date", { ascending: false });

    // Transform to types
    const formattedCalls: CaseCallRecord[] = (calls ?? []).map((c) => ({
      id: c.id,
      caseId: c.case_id,
      orgId: c.org_id,
      fileName: c.file_name,
      fileUrl: c.file_url,
      duration: c.duration,
      callType: c.call_type,
      callDate: c.call_date,
      participants: c.participants,
      transcriptText: c.transcript_text,
      status: c.status,
      createdBy: c.created_by,
      createdAt: c.created_at,
      processedAt: c.processed_at,
    }));

    const formattedNotes: AttendanceNote[] = (notes ?? []).map((n) => ({
      id: n.id,
      caseId: n.case_id,
      callRecordId: n.call_record_id,
      orgId: n.org_id,
      noteDate: n.note_date,
      attendees: n.attendees,
      summary: n.summary,
      adviceGiven: n.advice_given,
      issuesDiscussed: n.issues_discussed,
      risksIdentified: n.risks_identified,
      tasksCreated: n.tasks_created,
      keyDates: n.key_dates,
      followUpRequired: n.follow_up_required,
      followUpDetails: n.follow_up_details,
      createdBy: n.created_by,
      createdAt: n.created_at,
    }));

    return NextResponse.json({ calls: formattedCalls, notes: formattedNotes });
  } catch (error) {
    console.error("Failed to fetch audio records:", error);
    return NextResponse.json(
      { error: "Failed to fetch audio records" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cases/[caseId]/audio - Upload a new audio file
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, userId } = await requireAuthContext();
    const { caseId } = params;
    const supabase = getSupabaseAdminClient();

    // Verify case belongs to org
    const { data: caseRecord, error: caseError } = await supabase
      .from("cases")
      .select("id, title")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (caseError || !caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const body = await request.json();
    const { 
      fileName, 
      callType = "CLIENT", 
      callDate,
      participants = [],
      // For demo/testing - allow direct transcript input
      transcriptText,
    } = body;

    if (!fileName) {
      return NextResponse.json(
        { error: "fileName is required" },
        { status: 400 },
      );
    }

    // Create call record
    const { data: call, error: insertError } = await supabase
      .from("case_calls")
      .insert({
        case_id: caseId,
        org_id: orgId,
        file_name: fileName,
        call_type: callType,
        call_date: callDate ?? new Date().toISOString(),
        participants,
        transcript_text: transcriptText,
        status: transcriptText ? "COMPLETED" : "UPLOADED",
        created_by: userId,
        processed_at: transcriptText ? new Date().toISOString() : null,
      })
      .select("*")
      .single();

    if (insertError) {
      if (insertError.code === "42P01") {
        return NextResponse.json(
          { error: "Audio tables not yet created. Run migrations." },
          { status: 500 },
        );
      }
      throw insertError;
    }

    // If transcript provided, auto-generate attendance note
    if (transcriptText) {
      await generateAttendanceNote(supabase, {
        caseId,
        orgId,
        userId,
        callRecordId: call.id,
        transcriptText,
        caseTitle: caseRecord.title,
      });
    }

    return NextResponse.json({ call }, { status: 201 });
  } catch (error) {
    console.error("Failed to create audio record:", error);
    return NextResponse.json(
      { error: "Failed to create audio record" },
      { status: 500 },
    );
  }
}

/**
 * Generate attendance note from transcript using AI
 */
async function generateAttendanceNote(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  params: {
    caseId: string;
    orgId: string;
    userId: string;
    callRecordId: string;
    transcriptText: string;
    caseTitle: string;
  },
) {
  // For now, create a simple structured note
  // In production, this would call OpenAI to extract structured info
  
  const { caseId, orgId, userId, callRecordId, transcriptText, caseTitle } = params;

  // Simple extraction (placeholder - would use AI in production)
  const adviceGiven: string[] = [];
  const issuesDiscussed: string[] = [];
  const risksIdentified: string[] = [];
  const keyDates: Array<{ label: string; date: string }> = [];

  // Basic keyword detection for demo
  const lowerText = transcriptText.toLowerCase();
  
  if (lowerText.includes("advised") || lowerText.includes("recommend")) {
    adviceGiven.push("Legal advice provided during call - see transcript for details");
  }
  if (lowerText.includes("risk") || lowerText.includes("concern")) {
    risksIdentified.push("Potential risks discussed - review transcript");
  }
  if (lowerText.includes("deadline") || lowerText.includes("limitation")) {
    risksIdentified.push("Time-sensitive matter mentioned");
  }
  if (lowerText.includes("settlement") || lowerText.includes("offer")) {
    issuesDiscussed.push("Settlement/offer discussed");
  }

  // Create the attendance note
  const { data: note, error } = await supabase
    .from("attendance_notes")
    .insert({
      case_id: caseId,
      call_record_id: callRecordId,
      org_id: orgId,
      note_date: new Date().toISOString(),
      attendees: ["Fee Earner", "Client"],
      summary: `Attendance note for ${caseTitle}. Call transcript recorded and key points extracted.`,
      advice_given: adviceGiven,
      issues_discussed: issuesDiscussed,
      risks_identified: risksIdentified,
      key_dates: keyDates,
      follow_up_required: risksIdentified.length > 0,
      follow_up_details: risksIdentified.length > 0 
        ? "Review identified risks and take appropriate action" 
        : null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create attendance note:", error);
  }

  // Create tasks for risks
  if (risksIdentified.length > 0 && note) {
    await supabase.from("tasks").insert({
      case_id: caseId,
      org_id: orgId,
      title: "Review risks from call",
      description: `Risks identified in call: ${risksIdentified.join(", ")}`,
      created_by: userId,
      due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    });
  }

  return note;
}

