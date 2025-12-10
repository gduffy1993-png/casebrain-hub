import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getTrustAccounts } from "@/lib/trust-accounting/client-money";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { orgId } = await requireAuthContext();

    const accounts = await getTrustAccounts(orgId);

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("[Trust] Error fetching trust accounts:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch trust accounts" },
      { status: 500 }
    );
  }
}

