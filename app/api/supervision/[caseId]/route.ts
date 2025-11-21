import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateSupervisionPack } from "@/lib/housing/supervision-pack";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { caseId: string } },
) {
  const { orgId } = await requireAuthContext();
  const { caseId } = params;

  const supabase = getSupabaseAdminClient();

  // Check for existing pack
  const { data: existingPack } = await supabase
    .from("supervisor_pack")
    .select("pack_json, pack_markdown, generated_at, generated_by")
    .eq("case_id", caseId)
    .eq("org_id", orgId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingPack) {
    return NextResponse.json({
      pack: existingPack.pack_json,
      markdown: existingPack.pack_markdown,
      generatedAt: existingPack.generated_at,
      generatedBy: existingPack.generated_by,
      disclaimer:
        "This supervision pack is generated from extracted evidence and case data. It is procedural guidance only and does not constitute legal advice. All facts, dates, and recommendations should be verified independently by a qualified legal professional.",
    });
  }

  // Generate new pack if none exists
  try {
    const pack = await generateSupervisionPack(caseId, orgId);
    return NextResponse.json({
      pack,
      markdown: null,
      generatedAt: null,
      generatedBy: null,
      disclaimer:
        "This supervision pack is generated from extracted evidence and case data. It is procedural guidance only and does not constitute legal advice. All facts, dates, and recommendations should be verified independently by a qualified legal professional.",
    });
  } catch (error) {
    console.error("[supervision] Error fetching/generating supervision pack", {
      error,
      caseId,
      orgId,
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch supervision pack",
        disclaimer:
          "This is procedural guidance only and does not constitute legal advice.",
      },
      { status: 500 },
    );
  }
}

