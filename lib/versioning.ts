/**
 * CaseBrain Versioning System
 * 
 * Tracks versions of the core engine, individual brains, and provides
 * metadata for analysis outputs to ensure traceability and reproducibility.
 */

/**
 * Main CaseBrain platform version
 */
export const CASEBRAIN_VERSION = "1.0.0";

/**
 * Individual engine/brain versions
 */
export const ENGINE_VERSIONS = {
  risks: "1.0.0",
  limitation: "1.0.0",
  missingEvidence: "1.0.0",
  timeline: "1.0.0",
  outcomes: "1.0.0",
  complaintRisk: "1.0.0",
  drafting: "1.0.0",
  extraction: "1.0.0",
  nextSteps: "1.0.0",
  keyIssues: "1.0.0",
  compliance: "1.0.0",
  documentMap: "1.0.0",
} as const;

export type EngineVersions = typeof ENGINE_VERSIONS;
export type EngineName = keyof EngineVersions;

/**
 * Model information for AI calls
 */
export type ModelInfo = {
  provider: string;
  model: string;
  version?: string;
};

/**
 * Analysis metadata attached to every analysis snapshot
 */
export type AnalysisMeta = {
  casebrainVersion: string;
  engineVersions: EngineVersions;
  packId: string;
  packVersion: string;
  modelInfo?: ModelInfo;
  generatedAt: string;
  environment: "development" | "staging" | "production";
  userId?: string;
};

/**
 * Build analysis metadata for a case
 */
export function buildAnalysisMeta(params: {
  packId: string;
  packVersion: string;
  modelInfo?: ModelInfo;
  userId?: string;
}): AnalysisMeta {
  return {
    casebrainVersion: CASEBRAIN_VERSION,
    engineVersions: ENGINE_VERSIONS,
    packId: params.packId,
    packVersion: params.packVersion,
    modelInfo: params.modelInfo,
    generatedAt: new Date().toISOString(),
    environment: getEnvironment(),
    userId: params.userId,
  };
}

/**
 * Get current environment
 */
function getEnvironment(): "development" | "staging" | "production" {
  const env = process.env.NODE_ENV;
  const vercel = process.env.VERCEL_ENV;
  
  if (vercel === "production") return "production";
  if (vercel === "preview") return "staging";
  if (env === "production") return "production";
  return "development";
}

/**
 * Format version info for display
 */
export function formatVersionInfo(meta: AnalysisMeta): string {
  return `CaseBrain v${meta.casebrainVersion} | Pack: ${meta.packId} v${meta.packVersion} | Generated: ${new Date(meta.generatedAt).toLocaleString("en-GB")}`;
}

/**
 * Compare two analysis metas to detect version changes
 */
export function hasVersionChanged(oldMeta: AnalysisMeta, newMeta: AnalysisMeta): boolean {
  if (oldMeta.casebrainVersion !== newMeta.casebrainVersion) return true;
  if (oldMeta.packVersion !== newMeta.packVersion) return true;
  
  // Check if any engine version changed
  for (const key of Object.keys(oldMeta.engineVersions) as EngineName[]) {
    if (oldMeta.engineVersions[key] !== newMeta.engineVersions[key]) return true;
  }
  
  return false;
}


