/**
 * GET /api/criminal/[caseId]/offence
 *
 * Returns the resolved offence for the case (user override > charges + matter + bundle).
 * Used by UI (Overview, Strategy) and strategy engine for offence-specific behaviour.
 */

import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { buildCaseContext } from "@/lib/case-context";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { resolveOffence } from "@/lib/criminal/offence-resolution";
import { OFFENCE_TYPE_LABELS, normaliseOffenceType } from "@/lib/criminal/strategy-suggest/constants";

type RouteParams = {
  params: Promise<{ caseId: string }>;
};

const BUNDLE_SNIPPET_LENGTH = 2000;

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { userId, orgId: authOrgId } = authRes.context;

    const context = await buildCaseContext(caseId, { userId, orgIdHint: authOrgId });
    if (!context.case) {
      return NextResponse.json(
        { error: "Case not found", message: context.banner?.message ?? "Case not found" },
        { status: 404 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const orgId = context.case.org_id ?? context.orgScope?.orgIdResolved ?? authOrgId ?? "";

    const [chargesRes, matterRes] = await Promise.all([
      supabase
        .from("criminal_charges")
        .select("offence, section")
        .eq("case_id", caseId)
        .eq("org_id", orgId)
        .order("charge_date", { ascending: false }),
      supabase
        .from("criminal_cases")
        .select("alleged_offence, offence_override")
        .eq("id", caseId)
        .eq("org_id", orgId)
        .maybeSingle(),
    ]);

    const matterRow = matterRes.data as { alleged_offence?: string | null; offence_override?: string | null } | null;
    const offenceOverride = matterRow?.offence_override?.trim() || null;

    if (offenceOverride) {
      const offenceType = normaliseOffenceType(offenceOverride);
      return NextResponse.json({
        offenceType,
        label: OFFENCE_TYPE_LABELS[offenceType],
        source: "override",
      });
    }

    const charges = (chargesRes.data ?? []).map((c: { offence?: string; section?: string | null }) => ({
      offence: c.offence ?? "",
      section: c.section ?? null,
    }));
    const allegedOffence = matterRow?.alleged_offence ?? null;

    let bundleSnippet: string | undefined;
    if (context.documents.length > 0) {
      const parts: string[] = [];
      let total = 0;
      for (const doc of context.documents) {
        const raw = doc.raw_text ?? "";
        const text = typeof raw === "string" ? raw : "";
        if (text.length > 0) {
          parts.push(text);
          total += text.length;
          if (total >= BUNDLE_SNIPPET_LENGTH) break;
        }
      }
      bundleSnippet = parts.join(" ").slice(0, BUNDLE_SNIPPET_LENGTH);
    }

    const resolved = resolveOffence({
      charges,
      allegedOffence,
      bundleSnippet,
    });

    return NextResponse.json({
      offenceType: resolved.offenceType,
      label: resolved.label,
      source: resolved.source,
    });
  } catch (err) {
    console.error("[criminal/offence] GET error:", err);
    return NextResponse.json(
      { error: "Failed to resolve offence" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/criminal/[caseId]/offence
 * Set or clear user override for offence type. Strategy and UI will use override when set.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;

    const body = await request.json().catch(() => ({}));
    const offenceType = body.offenceType === null || body.offenceType === undefined
      ? null
      : typeof body.offenceType === "string" ? normaliseOffenceType(body.offenceType) : null;

    const supabase = getSupabaseAdminClient();

    const { error } = await supabase
      .from("criminal_cases")
      .update({
        offence_override: offenceType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseId)
      .eq("org_id", orgId);

    if (error) {
      console.error("[criminal/offence] PATCH error:", error);
      return NextResponse.json({ error: "Failed to update offence" }, { status: 500 });
    }

    const label = offenceType ? OFFENCE_TYPE_LABELS[offenceType] : null;
    return NextResponse.json({
      ok: true,
      offenceType,
      label: label ?? undefined,
      source: offenceType ? "override" : undefined,
    });
  } catch (err) {
    console.error("[criminal/offence] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update offence" }, { status: 500 });
  }
}
