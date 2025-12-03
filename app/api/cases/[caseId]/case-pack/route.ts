import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { buildCasePack } from "@/lib/case-pack";
import { generateCasePackPdf } from "@/lib/pdf/case-pack-pdf";

type RouteParams = {
  params: { caseId: string };
};

/**
 * GET /api/cases/[caseId]/case-pack - Generate and download case pack PDF
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, userId } = await requireAuthContext();
    const { caseId } = params;

    // Build the case pack
    const pack = await buildCasePack(caseId, orgId, userId);

    // Generate PDF
    const pdfBuffer = await generateCasePackPdf(pack);

    // Create filename
    const safeTitle = pack.caseTitle
      .replace(/[^a-z0-9]/gi, "_")
      .slice(0, 50);
    const filename = `CasePack_${safeTitle}_${new Date().toISOString().split("T")[0]}.pdf`;

    // Return as downloadable PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Failed to generate case pack:", error);
    return NextResponse.json(
      { error: "Failed to generate case pack" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cases/[caseId]/case-pack - Generate case pack data (JSON)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, userId } = await requireAuthContext();
    const { caseId } = params;

    // Build the case pack
    const pack = await buildCasePack(caseId, orgId, userId);

    return NextResponse.json({ pack });
  } catch (error) {
    console.error("Failed to build case pack:", error);
    return NextResponse.json(
      { error: "Failed to build case pack" },
      { status: 500 },
    );
  }
}

