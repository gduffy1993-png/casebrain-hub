import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getCaseEmails, getCaseEmailThreads, linkEmailToCase } from "@/lib/email/integration";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = await params;
    const { searchParams } = new URL(request.url);

    const view = searchParams.get("view") ?? "emails"; // 'emails' or 'threads'

    if (view === "threads") {
      const threads = await getCaseEmailThreads(caseId, orgId);
      return NextResponse.json(threads);
    }

    const emails = await getCaseEmails(caseId, orgId);
    return NextResponse.json(emails);
  } catch (error) {
    console.error("[Email] Error fetching case emails:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch emails" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { caseId } = await params;
    const body = await request.json();

    const { emailId, autoLinked } = body;

    if (!emailId) {
      return NextResponse.json(
        { error: "emailId is required" },
        { status: 400 }
      );
    }

    await linkEmailToCase(emailId, caseId, orgId, autoLinked ?? false);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Email] Error linking email to case:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to link email" },
      { status: 500 }
    );
  }
}

