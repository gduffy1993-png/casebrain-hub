import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getDocumentVersions, createDocumentVersion } from "@/lib/document/version-control";

type RouteParams = {
  params: Promise<{ documentId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { documentId } = await params;

    const versions = await getDocumentVersions(documentId, orgId);

    return NextResponse.json(versions);
  } catch (error) {
    console.error("[DocumentVersion] Error fetching versions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch versions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { userId, orgId } = await requireAuthContext();
    const { documentId } = await params;
    const body = await request.json();

    const {
      fileName,
      fileSize,
      storagePath,
      storageUrl,
      contentHash,
      versionName,
      changeSummary,
    } = body;

    if (!fileName || !storagePath) {
      return NextResponse.json(
        { error: "fileName and storagePath are required" },
        { status: 400 }
      );
    }

    const version = await createDocumentVersion(documentId, orgId, userId, {
      fileName,
      fileSize,
      storagePath,
      storageUrl,
      contentHash,
      versionName,
      changeSummary,
    });

    return NextResponse.json(version);
  } catch (error) {
    console.error("[DocumentVersion] Error creating version:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create version" },
      { status: 500 }
    );
  }
}

