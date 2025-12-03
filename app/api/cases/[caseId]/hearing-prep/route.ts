import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildHearingPrepPack } from "@/lib/hearing-prep";

type RouteParams = {
  params: { caseId: string };
};

/**
 * POST /api/cases/[caseId]/hearing-prep
 * 
 * Generate a comprehensive hearing preparation pack
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, userId } = await requireAuthContext();
    const { caseId } = params;

    // Get optional hearing details from request body
    let hearingType: string | undefined;
    let hearingDate: string | undefined;

    try {
      const body = await request.json();
      hearingType = body.hearingType;
      hearingDate = body.hearingDate;
    } catch {
      // Body is optional
    }

    // Build the hearing prep pack
    const pack = await buildHearingPrepPack(
      caseId,
      orgId,
      userId,
      hearingType,
      hearingDate,
    );

    return NextResponse.json({ pack });
  } catch (error) {
    console.error("Failed to generate hearing prep pack:", error);
    return NextResponse.json(
      { error: "Failed to generate hearing preparation pack" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cases/[caseId]/hearing-prep
 * 
 * Returns documentation about the hearing prep endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/cases/[caseId]/hearing-prep",
    method: "POST",
    description: "Generate a comprehensive hearing preparation pack",
    body: {
      hearingType: "string (optional) - e.g. 'CMC', 'Trial', 'Disposal'",
      hearingDate: "string (optional) - ISO date string",
    },
    sections: [
      "Case Overview",
      "Chronology",
      "Key Issues",
      "Evidence Overview",
      "Contradictions",
      "Opponent Behaviour",
      "Risks & Limitation",
      "Evidence Gaps",
      "Suggested Questions",
      "Draft Submissions",
      "Pre-Hearing Checklist",
    ],
  });
}

