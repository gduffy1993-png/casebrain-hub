import type { LayeredSummary } from "./types";

export type LayeredSummaryCache = {
  get: (input: { caseId: string; orgId: string }) => Promise<LayeredSummary | null>;
  set: (input: { caseId: string; orgId: string; layeredSummary: LayeredSummary }) => Promise<void>;
};

export const noopLayeredSummaryCache: LayeredSummaryCache = {
  get: async () => null,
  set: async () => undefined,
};


