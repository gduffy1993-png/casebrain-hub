import { NextResponse } from "next/server";
import type { OrgContext } from "@/lib/auth";
import { requireAuthContext } from "@/lib/auth";

export async function requireAuthContextApi(): Promise<
  | { ok: true; context: OrgContext }
  | { ok: false; response: NextResponse }
> {
  try {
    const context = await requireAuthContext();
    return { ok: true, context };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.toLowerCase().includes("unauthenticated")) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Unauthenticated", message },
          { status: 401 },
        ),
      };
    }

    if (
      message.toLowerCase().includes("invalid orgid") ||
      message.toLowerCase().includes("expected uuid") ||
      message.toLowerCase().includes("organisation resolution failed")
    ) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Invalid organisation context", message },
          { status: 400 },
        ),
      };
    }

    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication context failed", message },
        { status: 500 },
      ),
    };
  }
}


