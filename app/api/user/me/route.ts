import { NextResponse } from "next/server";
import { requireAuthContext, getCurrentUser } from "@/lib/auth-supabase";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET() {
  try {
    const { userId, orgId, role } = await requireAuthContext();
    const user = await getCurrentUser();
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
      user: {
        id: user?.id,
        fullName: user?.fullName,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        emailAddresses: user?.email ? [user.email] : [],
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

