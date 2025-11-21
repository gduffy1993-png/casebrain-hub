import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { generateDisclosureList } from "@/lib/core/bundle";

export const runtime = "nodejs";

/**
 * Core Litigation Brain - Disclosure List API
 * 
 * Generates disclosure list for a case.
 */
export async function GET(
  request: Request,
  { params }: { params: { caseId: string } },
) {
  const { caseId } = params;
  const { orgId } = await requireAuthContext();

  try {
    const disclosureList = await generateDisclosureList(caseId, orgId);

    return NextResponse.json({ disclosureList });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate disclosure list",
      },
      { status: 500 },
    );
  }
}

