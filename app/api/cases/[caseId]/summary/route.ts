import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCaseSummary } from "@/lib/case-summary";
import { buildCaseContext } from "@/lib/case-context";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build canonical case context (single source of truth)
    const context = await buildCaseContext(caseId, { userId });
    const reasonCodes = context.diagnostics.reasonCodes;

    // Gate 1: Case not found
    if (!context.case || reasonCodes.includes("CASE_NOT_FOUND")) {
      console.log(`[case-summary] Gate triggered: CASE_NOT_FOUND for caseId=${caseId}`);
      return NextResponse.json(
        {
          error: "Case not found",
          banner: context.banner || {
            type: "error",
            title: "Case not found",
            message: "Case not found for your org scope. Re-upload or contact support.",
          },
          diagnostics: context.diagnostics,
        },
        { status: 200 } // Return 200 with banner, not 404
      );
    }

    // Gate 2: No documents - still generate summary from case data
    if (reasonCodes.includes("DOCS_NONE")) {
      console.log(`[case-summary] Gate triggered: DOCS_NONE for caseId=${caseId}`);
      const summary = await generateCaseSummary({ caseId, orgId: context.orgScope.orgIdResolved });
      return NextResponse.json({
        ...summary,
        banner: context.banner,
        diagnostics: context.diagnostics,
      });
    }

    // Gate 3: Facts-first gating - if suspected scanned or text is too thin, return banner
    // DO NOT generate full summary when extraction is empty
    // Explicit check: NEVER generate summary when rawCharsTotal is 0
    if (context.diagnostics.rawCharsTotal === 0 || reasonCodes.includes("SCANNED_SUSPECTED") || reasonCodes.includes("TEXT_THIN")) {
      console.log(`[case-summary] Gate triggered: ${reasonCodes.includes("SCANNED_SUSPECTED") ? "SCANNED_SUSPECTED" : "TEXT_THIN"} for caseId=${caseId}, rawChars=${context.diagnostics.rawCharsTotal}`);
      // Still generate minimal summary from case data, but with banner
      const summary = await generateCaseSummary({ caseId, orgId: context.orgScope.orgIdResolved });
      return NextResponse.json({
        ...summary,
        banner: context.banner || {
          severity: "warning",
          title: "Insufficient text extracted",
          message: "Not enough extractable text to generate reliable summary. Upload text-based PDFs or run OCR, then re-analyse.",
        },
        diagnostics: context.diagnostics,
      });
    }

    // Gate 4: OK - case and documents found with extractable text
    if (!reasonCodes.includes("OK")) {
      console.warn(`[case-summary] Unexpected reasonCodes for caseId=${caseId}: [${reasonCodes.join(", ")}]`);
    }

    console.log(`[case-summary] Generating summary for caseId=${caseId}, docCount=${context.diagnostics.docCount}, rawChars=${context.diagnostics.rawCharsTotal}`);
    const summary = await generateCaseSummary({ caseId, orgId: context.orgScope.orgIdResolved });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[case-summary] Error:", error);
    
    if (error instanceof Error && error.message === "Case not found") {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 200 } // Return 200 with error, not 404
      );
    }

    return NextResponse.json(
      { error: "Failed to generate case summary" },
      { status: 500 }
    );
  }
}

