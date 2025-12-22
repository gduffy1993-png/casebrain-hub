/**
 * Standard API Response Helpers
 * 
 * All case-page endpoints must use these helpers to ensure consistent response shapes.
 */

import { NextResponse } from "next/server";
import type { CaseContext } from "@/lib/case-context";

export type ApiResponse<T> = {
  ok: boolean;
  data: T | null;
  banner?: {
    severity: "info" | "warning" | "error";
    title: string;
    detail?: string;
  };
  diagnostics?: {
    caseId: string;
    orgId: string;
    documentCount: number;
    documentsWithRawText: number;
    rawCharsTotal: number;
    jsonCharsTotal: number;
    suspectedScanned: boolean;
    textThin: boolean;
    keyTermsFound?: string[];
    traceId: string;
    updatedAt: string;
  };
  errors?: Array<{ code: string; message: string }>;
};

/**
 * Generate a trace ID for this request cycle
 */
function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert CaseContext diagnostics to ApiResponse diagnostics
 */
function diagnosticsFromContext(
  caseId: string,
  context: CaseContext,
  keyTermsFound?: string[],
): ApiResponse<any>["diagnostics"] {
  const traceId = generateTraceId();
  const documentsWithRawText = context.documents.filter(
    (d) => d.raw_text && typeof d.raw_text === "string" && d.raw_text.length > 0
  ).length;

  return {
    caseId,
    orgId: context.orgScope.orgIdResolved,
    documentCount: context.diagnostics.docCount,
    documentsWithRawText,
    rawCharsTotal: context.diagnostics.rawCharsTotal,
    jsonCharsTotal: context.diagnostics.jsonCharsTotal,
    suspectedScanned: context.diagnostics.suspectedScanned,
    textThin: context.diagnostics.reasonCodes.includes("TEXT_THIN"),
    keyTermsFound,
    traceId,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create a successful API response
 */
export function makeOk<T>(
  data: T,
  context: CaseContext,
  caseId: string,
  keyTermsFound?: string[],
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    ok: true,
    data,
    diagnostics: diagnosticsFromContext(caseId, context, keyTermsFound),
  });
}

/**
 * Create a gated/failed API response (insufficient data)
 */
export function makeGateFail<T>(
  banner: { severity: "info" | "warning" | "error"; title: string; detail?: string },
  context: CaseContext,
  caseId: string,
  keyTermsFound?: string[],
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    ok: false,
    data: null,
    banner,
    diagnostics: diagnosticsFromContext(caseId, context, keyTermsFound),
  });
}

/**
 * Create an error API response (server/processing error)
 */
export function makeError<T>(
  code: string,
  message: string,
  context: CaseContext,
  caseId: string,
  keyTermsFound?: string[],
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      ok: false,
      data: null,
      errors: [{ code, message }],
      diagnostics: diagnosticsFromContext(caseId, context, keyTermsFound),
    },
    { status: 500 },
  );
}

/**
 * Create a not found response
 */
export function makeNotFound<T>(
  context: CaseContext,
  caseId: string,
): NextResponse<ApiResponse<T>> {
  // Map CaseContext.banner (which has `message` and optional `title`) to ApiResponse.banner (which has `detail` and required `title`)
  const banner = context.banner
    ? {
        severity: context.banner.severity,
        title: context.banner.title || "Case not found",
        detail: context.banner.message,
      }
    : {
        severity: "error" as const,
        title: "Case not found",
        detail: "Case not found for your org scope.",
      };

  return NextResponse.json(
    {
      ok: false,
      data: null,
      banner,
      diagnostics: diagnosticsFromContext(caseId, context),
    },
    { status: 404 },
  );
}
