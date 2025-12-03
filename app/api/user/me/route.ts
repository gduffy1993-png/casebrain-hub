import { NextResponse } from "next/server";
import { requireAuthContext, getCurrentUser } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET() {
  try {
    const { userId, orgId, role } = await requireAuthContext();
    const clerkUser = await getCurrentUser();
    const supabase = getSupabaseAdminClient();

    // Get user from database
    const { data: dbUser } = await supabase
      .from("users")
      .select("id, email, name, role, org_id")
      .eq("id", userId)
      .maybeSingle();

    return NextResponse.json({
      userId,
      orgId,
      role,
      clerk: {
        id: clerkUser?.id,
        fullName: clerkUser?.fullName,
        firstName: clerkUser?.firstName,
        lastName: clerkUser?.lastName,
        email: clerkUser?.primaryEmailAddress?.emailAddress,
        emailAddresses: clerkUser?.emailAddresses?.map(e => e.emailAddress),
      },
      database: dbUser || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch user info" },
      { status: 500 }
    );
  }
}

