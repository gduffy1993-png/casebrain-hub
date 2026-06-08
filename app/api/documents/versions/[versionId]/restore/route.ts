import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { restoreDocumentVersion } from "@/lib/document/version-control";

type RouteParams = {
  params: Promise<{ versionId: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { userId, orgId } = await requireAuthContext();
    const { versionId } = await params;

    const version = await restoreDocumentVersion(versionId, orgId, userId);

    return NextResponse.json(version);
  } catch (error) {
    console.error("[DocumentVersion] Error restoring version:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore version" },
      { status: 500 }
    );
  }
}

