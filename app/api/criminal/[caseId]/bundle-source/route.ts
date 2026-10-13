import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { buildBundleSourcePayload } from "@/lib/bundle/parse-bundle-display";
import { buildAuthenticatedMatterCanonicalFromDocuments } from "@/lib/criminal/authenticated-matter-canonical";
import { isScheduleChaseLabEnabled } from "@/lib/criminal/schedule-chase-lab-types";
import { resolveOwnedScheduleColumnPages } from "@/lib/criminal/schedule-chase-owned-column-pages";

type RouteParams = { params: Promise<{ caseId: string }> };

/**
 * GET /api/criminal/[caseId]/bundle-source
 * Bundle header fields, document health, MG snippets, and live canonical pipeline
 * from authenticated uploaded documents (matter-loading path used by Overview / War Room /
 * Chase / Control Room / truth map).
 *
 * Copy-only: when CASEBRAIN_SCHEDULE_CHASE_LAB=1, schedule chase uses column pages from
 * the case's owned uploaded PDF (storage). Without that PDF, unsupported input is visible.
 * Default remains off — production behaviour unchanged.
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
      .select("id, name, type, updated_at, raw_text, extracted_text, extracted_json, storage_url")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false });

    if (docErr) {
      return NextResponse.json({ ok: false, error: "Failed to load documents" }, { status: 500 });
    }

    const rows = docs ?? [];
    const payload = buildBundleSourcePayload(rows);

    const scheduleLabOn = isScheduleChaseLabEnabled();
    let scheduleChaseLab:
      | boolean
      | {
          enabled: true;
          pages?: string[] | null;
          scheduleNotEstablished?: boolean;
          multipleSchedulesUnresolved?: boolean;
          scheduleDocuments?: Array<{
            documentId: string;
            documentName: string;
            rowCount: number;
          }>;
          scheduleObservations?: Array<{
            documentId: string;
            documentName: string;
            page: number;
            reference: string;
            item: string;
            statusWord: string;
            side: "served" | "missing";
            line: string;
          }>;
          sourceDocumentId?: string | null;
          sourceDocumentName?: string | null;
        }
      | undefined;
    if (scheduleLabOn) {
      const column = await resolveOwnedScheduleColumnPages({
        supabase,
        orgId,
        caseId,
        docs: rows,
      });
      if (column?.kind === "schedule" && column.schedules.length > 1) {
        scheduleChaseLab = {
          enabled: true,
          multipleSchedulesUnresolved: true,
          scheduleDocuments: column.schedules.map((row) => ({
            documentId: row.documentId,
            documentName: row.documentName,
            rowCount: row.rowCount,
          })),
          scheduleObservations: column.schedules.flatMap((row) =>
            row.observations.map((obs) => ({
              documentId: row.documentId,
              documentName: row.documentName,
              page: obs.page,
              reference: obs.reference,
              item: obs.item,
              statusWord: obs.statusWord,
              side: obs.side,
              line: obs.line,
            })),
          ),
        };
      } else if (column?.kind === "schedule" && column.pages?.length) {
        scheduleChaseLab = {
          enabled: true,
          pages: column.pages,
          sourceDocumentId: column.documentId,
          sourceDocumentName: column.documentName,
        };
      } else if (column?.kind === "no-schedule") {
        scheduleChaseLab = { enabled: true, scheduleNotEstablished: true };
      } else {
        // No owned PDF bytes / column pages — visible unsupported input.
        scheduleChaseLab = { enabled: true };
      }
    }

    const built = buildAuthenticatedMatterCanonicalFromDocuments(rows, {
      caseId,
      caseTitle: typeof caseRow.title === "string" ? caseRow.title : null,
      allegation: payload.caseMetadata?.offenceDisplay ?? payload.header?.shortTitle ?? null,
      withSurfaces: scheduleLabOn,
      scheduleChaseLab,
    });
    const { canonical, surfaces } = built;
    const withheld = canonical.ingestion.substantiveOutputsWithheld;

    return NextResponse.json({
      ok: true,
      data: {
        combinedTextLength: withheld ? 0 : payload.combinedText.length,
        documentCount: rows.length,
        documentRows: payload.documentRows,
        health: withheld ? { ...payload.health, status: "empty" } : payload.health,
        header: withheld ? null : payload.header,
        snippets: withheld ? [] : payload.snippets,
        caseMetadata: withheld ? null : payload.caseMetadata,
        sizeProfile: payload.sizeProfile,
        frontMatterScanLength: withheld ? 0 : payload.frontMatterScan.length,
        frontMatterScan: withheld ? "" : payload.frontMatterScan,
        /** Live canonical pipeline from uploaded document/page units. */
        canonical,
        /** Present only when schedule chase lab is explicitly enabled on this copy. */
        surfaces: scheduleLabOn && !withheld ? surfaces : null,
      },
    });
  } catch (e) {
    console.error("[bundle-source]", e);
    return NextResponse.json({ ok: false, error: "Bundle source failed" }, { status: 500 });
  }
}
