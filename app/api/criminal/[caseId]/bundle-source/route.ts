import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildBundleSourcePayload } from "@/lib/bundle/parse-bundle-display";
import { buildAuthenticatedMatterCanonicalFromDocuments } from "@/lib/criminal/authenticated-matter-canonical";

type RouteParams = { params: Promise<{ caseId: string }> };

/**
 * GET /api/criminal/[caseId]/bundle-source
 * Bundle header fields, document health, MG snippets, and live canonical pipeline
 * from authenticated uploaded documents (matter-loading path used by Overview / War Room /
 * Chase / Control Room / truth map).
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { caseId } = await params;
    const authRes = await requireAuthContextApi();
    if (!authRes.ok) return authRes.response;
    const { orgId } = authRes.context;
    const supabase = getSupabaseAdminClient();

    const { data: caseRow, error: caseErr } = await supabase
      .from("cases")
      .select("id, title")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (caseErr || !caseRow) {
      return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
    }

    const { data: docs, error: docErr } = await supabase
      .from("documents")
      .select("id, name, updated_at, raw_text, extracted_text, extracted_json")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false });

    if (docErr) {
      return NextResponse.json({ ok: false, error: "Failed to load documents" }, { status: 500 });
    }

    const rows = docs ?? [];
    const payload = buildBundleSourcePayload(rows);
    const { canonical } = buildAuthenticatedMatterCanonicalFromDocuments(rows, {
      caseId,
      caseTitle: typeof caseRow.title === "string" ? caseRow.title : null,
      allegation: payload.caseMetadata?.offenceDisplay ?? payload.header?.shortTitle ?? null,
    });

    return NextResponse.json({
      ok: true,
      data: {
        combinedTextLength: payload.combinedText.length,
        documentCount: rows.length,
        documentRows: payload.documentRows,
        health: payload.health,
        header: payload.header,
        snippets: payload.snippets,
        caseMetadata: payload.caseMetadata,
        sizeProfile: payload.sizeProfile,
        frontMatterScanLength: payload.frontMatterScan.length,
        frontMatterScan: payload.frontMatterScan,
        /** Live canonical pipeline from uploaded document/page units. */
        canonical,
      },
    });
  } catch (e) {
    console.error("[bundle-source]", e);
    return NextResponse.json({ ok: false, error: "Bundle source failed" }, { status: 500 });
  }
}
