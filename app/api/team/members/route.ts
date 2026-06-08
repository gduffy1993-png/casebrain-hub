import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getOrgMembers } from "@/lib/auth";

export async function GET() {
  const { orgId } = await requireAuthContext();
  
  try {
    const members = await getOrgMembers(orgId);
    return NextResponse.json({ members });
  } catch (error) {
    console.error("[team/members] Failed to fetch members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

