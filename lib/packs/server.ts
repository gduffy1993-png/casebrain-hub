import "server-only";

import type { PracticeArea } from "../types/casebrain";
import type { 
  LitigationPack, 
  PackId, 
  FirmPackOverride, 
  FirmPackOverrideData 
} from "./types";
import { basePack } from "./base";
import { housingPack } from "./housing";
import { piPack } from "./pi";
import { clinicalNegPack } from "./clinicalNeg";
import { familyPack } from "./family";

// Pack registry for server-only functions (to avoid circular dependency with index.ts)
const PACKS: Record<string, LitigationPack> = {
  other_litigation: basePack,
  housing_disrepair: housingPack,
  personal_injury: piPack,
  clinical_negligence: clinicalNegPack,
  family: familyPack,
};

/**
 * Get the litigation pack for a given practice area (server-only version)
 */
function getPackForPracticeArea(practiceArea?: PracticeArea | string | null): LitigationPack {
  if (!practiceArea) {
    return basePack;
  }

  // Normalize practice area string
  const normalized = practiceArea.toLowerCase().replace(/[^a-z_]/g, "_");
  
  if (normalized in PACKS) {
    return PACKS[normalized];
  }
  
  // Housing variants
  if (normalized.includes("housing") || normalized.includes("disrepair")) {
    return PACKS.housing_disrepair;
  }
  
  // PI variants
  if (normalized.includes("pi") || normalized.includes("personal") || normalized.includes("injury") || 
      normalized.includes("rta") || normalized.includes("accident")) {
    return PACKS.personal_injury;
  }
  
  // Clinical negligence variants
  if (normalized.includes("clin") || normalized.includes("medical") || normalized.includes("negligence")) {
    return PACKS.clinical_negligence;
  }
  
  // Family
  if (normalized.includes("family") || normalized.includes("child") || normalized.includes("divorce") ||
      normalized.includes("matrimonial") || normalized.includes("financial_remedy")) {
    return PACKS.family;
  }
  
  return basePack;
}

// Cache for firm overrides (in-memory, refreshed on demand)
const firmOverrideCache = new Map<string, { pack: LitigationPack; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Apply firm-specific overrides to a base pack
 */
function applyFirmOverrides(
  basePack: LitigationPack,
  overrides: FirmPackOverrideData
): LitigationPack {
  const pack = { ...basePack };

  // Evidence checklist overrides
  if (overrides.additionalEvidence?.length || overrides.disableEvidenceIds?.length) {
    const disabledIds = new Set(overrides.disableEvidenceIds ?? []);
    pack.evidenceChecklist = [
      ...basePack.evidenceChecklist.filter(e => !disabledIds.has(e.id)),
      ...(overrides.additionalEvidence ?? []),
    ];
  }

  // Compliance items overrides
  if (overrides.additionalCompliance?.length || overrides.disableComplianceIds?.length) {
    const disabledIds = new Set(overrides.disableComplianceIds ?? []);
    pack.complianceItems = [
      ...basePack.complianceItems.filter(c => !disabledIds.has(c.id)),
      ...(overrides.additionalCompliance ?? []),
    ];
  }

  // Risk rules overrides
  if (overrides.additionalRiskRules?.length || overrides.disableRiskRuleIds?.length) {
    const disabledIds = new Set(overrides.disableRiskRuleIds ?? []);
    pack.riskRules = [
      ...basePack.riskRules.filter(r => !disabledIds.has(r.id)),
      ...(overrides.additionalRiskRules ?? []),
    ];
  }

  // Key issues templates
  if (overrides.additionalKeyIssues?.length) {
    pack.keyIssuesTemplates = [
      ...basePack.keyIssuesTemplates,
      ...overrides.additionalKeyIssues,
    ];
  }

  // Glossary
  if (overrides.additionalGlossary?.length) {
    pack.glossary = [
      ...basePack.glossary,
      ...overrides.additionalGlossary,
    ];
  }

  // Prompt hints (merge)
  if (overrides.promptHintsOverride) {
    pack.promptHints = {
      ...basePack.promptHints,
      ...overrides.promptHintsOverride,
    };
  }

  // Hearing prep checklist
  if (overrides.additionalHearingPrepChecklist?.length) {
    pack.hearingPrepChecklist = [
      ...basePack.hearingPrepChecklist,
      ...overrides.additionalHearingPrepChecklist,
    ];
  }

  // Instructions to counsel hints
  if (overrides.additionalInstructionsToCounselHints?.length) {
    pack.instructionsToCounselHints = [
      ...basePack.instructionsToCounselHints,
      ...overrides.additionalInstructionsToCounselHints,
    ];
  }

  // Description override
  if (overrides.firmDescription) {
    pack.description = overrides.firmDescription;
  }

  return pack;
}

/**
 * Get firm-specific pack with overrides applied
 * Falls back to base pack if no overrides found or on error
 */
export async function getFirmPack(
  orgId: string | null | undefined,
  practiceArea: PracticeArea | string | null | undefined
): Promise<LitigationPack> {
  const basePack = getPackForPracticeArea(practiceArea);
  
  if (!orgId) {
    return basePack;
  }

  const cacheKey = `${orgId}:${basePack.id}`;
  const cached = firmOverrideCache.get(cacheKey);
  
  if (cached && cached.expires > Date.now()) {
    return cached.pack;
  }

  try {
    // Use admin client
    const { getSupabaseAdminClient } = await import("@/lib/supabase");
    const supabase = getSupabaseAdminClient();

    const { data: override, error } = await supabase
      .from("firm_pack_overrides")
      .select("*")
      .eq("org_id", orgId)
      .eq("pack_id", basePack.id)
      .maybeSingle();

    if (error) {
      console.error("[getFirmPack] Error fetching firm overrides:", error);
      return basePack;
    }

    if (!override) {
      // Cache the lack of override too
      firmOverrideCache.set(cacheKey, {
        pack: basePack,
        expires: Date.now() + CACHE_TTL_MS,
      });
      return basePack;
    }

    const firmPack = applyFirmOverrides(basePack, override.overrides as FirmPackOverrideData);
    
    firmOverrideCache.set(cacheKey, {
      pack: firmPack,
      expires: Date.now() + CACHE_TTL_MS,
    });

    return firmPack;
  } catch (err) {
    console.error("[getFirmPack] Unexpected error:", err);
    return basePack;
  }
}

/**
 * Clear firm override cache for a specific org or all orgs
 */
export function clearFirmOverrideCache(orgId?: string): void {
  if (orgId) {
    // Clear all entries for this org
    for (const key of firmOverrideCache.keys()) {
      if (key.startsWith(`${orgId}:`)) {
        firmOverrideCache.delete(key);
      }
    }
  } else {
    firmOverrideCache.clear();
  }
}

/**
 * Get firm pack override record (for admin/settings UI)
 */
export async function getFirmPackOverride(
  orgId: string,
  packId: PackId
): Promise<FirmPackOverride | null> {
  try {
    const { getSupabaseAdminClient } = await import("@/lib/supabase");
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("firm_pack_overrides")
      .select("*")
      .eq("org_id", orgId)
      .eq("pack_id", packId)
      .maybeSingle();

    if (error) {
      console.error("[getFirmPackOverride] Error:", error);
      return null;
    }

    return data as FirmPackOverride | null;
  } catch (err) {
    console.error("[getFirmPackOverride] Unexpected error:", err);
    return null;
  }
}

/**
 * Save firm pack override (upsert)
 */
export async function saveFirmPackOverride(
  orgId: string,
  packId: PackId,
  overrides: FirmPackOverrideData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { getSupabaseAdminClient } = await import("@/lib/supabase");
    const supabase = getSupabaseAdminClient();

    const { error } = await supabase
      .from("firm_pack_overrides")
      .upsert(
        {
          org_id: orgId,
          pack_id: packId,
          overrides,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "org_id,pack_id",
        }
      );

    if (error) {
      console.error("[saveFirmPackOverride] Error:", error);
      return { success: false, error: error.message };
    }

    // Clear cache for this org
    clearFirmOverrideCache(orgId);

    return { success: true };
  } catch (err) {
    console.error("[saveFirmPackOverride] Unexpected error:", err);
    return { success: false, error: "Unexpected error saving override" };
  }
}

/**
 * Delete firm pack override
 */
export async function deleteFirmPackOverride(
  orgId: string,
  packId: PackId
): Promise<{ success: boolean; error?: string }> {
  try {
    const { getSupabaseAdminClient } = await import("@/lib/supabase");
    const supabase = getSupabaseAdminClient();

    const { error } = await supabase
      .from("firm_pack_overrides")
      .delete()
      .eq("org_id", orgId)
      .eq("pack_id", packId);

    if (error) {
      console.error("[deleteFirmPackOverride] Error:", error);
      return { success: false, error: error.message };
    }

    // Clear cache for this org
    clearFirmOverrideCache(orgId);

    return { success: true };
  } catch (err) {
    console.error("[deleteFirmPackOverride] Unexpected error:", err);
    return { success: false, error: "Unexpected error deleting override" };
  }
}

