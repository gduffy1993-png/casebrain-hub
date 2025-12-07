import { NextResponse } from "next/server";
import { requireAuthContext, getCurrentUser } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

// TODO: Set this to your Clerk user ID in production
const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID || "";

export async function GET() {
  try {
    const { userId } = await requireAuthContext();

    if (userId !== ADMIN_USER_ID) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data: orgs, error } = await supabase
      .from("organisations")
      .select("id, name, plan, email_domain")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ organisations: orgs || [] });
  } catch (error) {
    console.error("[admin] Failed to fetch organisations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organisations" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId } = await requireAuthContext();

    if (userId !== ADMIN_USER_ID) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { organisationId, plan } = body;

    if (!organisationId || !plan) {
      return NextResponse.json(
        { error: "organisationId and plan are required" },
        { status: 400 },
      );
    }

    if (!["FREE", "LOCKED", "PAID_MONTHLY", "PAID_YEARLY"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("organisations")
      .update({ plan })
      .eq("id", organisationId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin] Failed to update organisation:", error);
    return NextResponse.json(
      { error: "Failed to update organisation" },
      { status: 500 },
    );
  }
}

