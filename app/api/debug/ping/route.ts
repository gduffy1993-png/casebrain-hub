/**
 * GET /api/debug/ping
 * 
 * Minimal smoke-test endpoint to verify deployments.
 * No auth, no paywall, always returns JSON.
 * 
 * Usage:
 *   GET /api/debug/ping
 * 
 * Returns:
 *   { ok: true, env: "production" | "development", timestamp: string }
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs"; // Explicitly set runtime

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
}

