/**
 * Text Gate Helper
 * 
 * Wraps guardAnalysis to return a result object instead of throwing.
 * Use this in endpoints that need to return ApiResponse shape.
 */

import type { CaseContext } from "@/lib/case-context";
import { guardAnalysis, AnalysisGateError } from "@/lib/case-context";

export type GateResult = {
  ok: boolean;
  banner?: {
    severity: "info" | "warning" | "error";
    title: string;
    detail?: string;
  };
  diagnostics?: CaseContext["diagnostics"];
};

/**
 * Check if analysis can be generated, returning a result object
 * (Does not throw - returns ok:false with banner if gated)
 */
export function checkAnalysisGate(context: CaseContext): GateResult {
  try {
    guardAnalysis(context);
    return { ok: true };
  } catch (error) {
    if (error instanceof AnalysisGateError) {
      return {
        ok: false,
        banner: {
          severity: error.banner?.severity || "warning",
          title: error.banner?.title || "Insufficient text extracted",
          detail: error.banner?.message,
        },
        diagnostics: error.diagnostics,
      };
    }
    // Re-throw if it's not an AnalysisGateError
    throw error;
  }
}
