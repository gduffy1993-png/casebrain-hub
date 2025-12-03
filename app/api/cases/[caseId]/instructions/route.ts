import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildInstructionsToCounselDraft } from "@/lib/instructions-to-counsel";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

/**
 * POST /api/cases/[caseId]/instructions
 * 
 * Generates a draft Instructions to Counsel document for a case,
 * aggregating data from all available brains and sources.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, userId } = await requireAuthContext();
    const { caseId } = await params;

    // Try to get existing data from request body (if provided by case page)
    let existingData: Parameters<typeof buildInstructionsToCounselDraft>[3] | undefined;
    try {
      const body = await request.json().catch(() => null);
      if (body && typeof body === "object" && ("timeline" in body || "keyIssues" in body || "parties" in body)) {
        existingData = {
          timeline: body.timeline,
          keyIssues: body.keyIssues,
          parties: body.parties,
          documents: body.documents,
          caseRecord: body.caseRecord,
          clientName: body.clientName,
          opponentName: body.opponentName,
        };
        console.log(`[Instructions] Using existing data: ${existingData.timeline?.length ?? 0} timeline events, ${existingData.keyIssues?.length ?? 0} key issues`);
      }
    } catch {
      // No body or invalid JSON - continue without existing data
    }

    console.log(`[Instructions] Generating draft for case ${caseId}`);
    const draft = await buildInstructionsToCounselDraft(caseId, orgId, userId, existingData);
    console.log(`[Instructions] Generated draft with ${draft.sections.length} sections`);

    return NextResponse.json({ draft });
  } catch (error) {
    console.error("[Instructions] Failed to generate instructions to counsel:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[Instructions] Error details:", { errorMessage, errorStack });
    return NextResponse.json(
      { 
        error: "Failed to generate instructions to counsel",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cases/[caseId]/instructions
 * 
 * Returns documentation about this endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/cases/[caseId]/instructions",
    method: "POST",
    description: "Generate a draft Instructions to Counsel document",
    response: {
      draft: {
        caseId: "string",
        generatedAt: "ISO date string",
        generatedByUserId: "string",
        sections: [
          {
            id: "string",
            title: "string",
            content: "string",
          },
        ],
      },
    },
    sections: [
      "Parties & Case Overview",
      "Instructions & Client Objective",
      "Background Facts & Chronology",
      "Key Issues in Dispute",
      "Evidence & Bundle Overview",
      "Risks, Limitation & Compliance",
      "Opponent Behaviour & Delays",
      "Potential Contradictions (if detected)",
      "Questions for Counsel / Advice Sought",
    ],
  });
}

