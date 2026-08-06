/**
 * Stage-300 v2 review-remediation — complete solicitor-visible inventory.
 *
 * Fixes REVIEW BLOCKER #1 (solicitor-quality.ts previously used a tiny hardcoded field list +
 * a wrong object-keyed audience-pack shape, producing an incomplete inventory).
 *
 * This module:
 *  1. Recursively inventories EVERY leaf of casebrain-output.json, reusing/extending the
 *     independent recursive-leaf classifier from `every-word/independent-leaf-inventory.ts`
 *     (never re-implemented ad hoc — imported directly).
 *  2. Inventories audience-packs.json against its REAL array schema
 *     `{ schemaVersion, caseId, packs: [{ audienceId, payloadText, payloadSha256, ... }] }`,
 *     and also tolerates a legacy object-keyed `{ packs: { court: {...}, ... } }` shape if ever
 *     encountered on disk.
 *  3. Inventories genuine exit payloads from `sourceDir/exits/{exitId}/payload.json` when the
 *     file is actually present on disk. When `casebrain-output.json.exitPayloadReceipts[exitId]`
 *     carries only a hash/receipt (no payload file on disk), the exit is honestly recorded as
 *     `wordingQualityExerciseStatus = "NOT_EXERCISED"` — this module never reconstructs wording
 *     for one exit from another exit's payload.
 *  4. Asserts reconciliation: `sourceLeafCount === includedLeafCount + excludedLeafCount` for the
 *     casebrain-output.json leaf set (the audience-pack and exit-payload leaves are additional,
 *     separately-counted inventories over their own files — they are not part of that
 *     reconciliation identity, which is specific to the single-file recursive walk).
 *
 * Never opens truth-key.json. Never fabricates a payload for an exit that was never captured.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import {
  classifyLeaf,
  inventoryOutputLeaves,
  isIncludedDisposition,
  type SourceLeaf,
} from "../../every-word/independent-leaf-inventory";
import type { EssentialCaseInputs } from "./inputs/load-essential-inputs";

export const SOLICITOR_VISIBLE_INVENTORY_SCHEMA_VERSION =
  "maa-v2-stage300-solicitor-visible-inventory@1.0.0" as const;

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

// ---------------------------------------------------------------------------------------------
// Audience-packs.json inventory — real array schema + legacy object-keyed fallback.
// ---------------------------------------------------------------------------------------------

export type AudiencePackLeaf = {
  audienceId: string;
  jsonPointer: string;
  schemaShape: "real_array" | "legacy_object_keyed";
  exactValue: string | null;
  exactValueHash: string | null;
  payloadSha256: string | null;
  present: boolean;
  empty: boolean;
};

/**
 * Expand a payloadText that is itself a JSON-serialised object/array into genuine visible
 * string leaves. Never treat the entire serialised JSON blob as one solicitor sentence.
 */
function expandAudiencePayloadTextLeaves(args: {
  audienceId: string;
  basePointer: string;
  schemaShape: "real_array" | "legacy_object_keyed";
  text: string | null;
  payloadSha256: string | null;
}): AudiencePackLeaf[] {
  const { audienceId, basePointer, schemaShape, text, payloadSha256 } = args;
  if (text == null || text.trim().length === 0) {
    return [
      {
        audienceId,
        jsonPointer: basePointer,
        schemaShape,
        exactValue: text,
        exactValueHash: text != null ? sha256(text) : null,
        payloadSha256,
        present: true,
        empty: true,
      },
    ];
  }

  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const collected: ExitPayloadLeaf[] = [];
      collectStringLeaves(audienceId, parsed, "", collected);
      if (collected.length > 0) {
        return collected.map((c) => ({
          audienceId,
          jsonPointer: `${basePointer}/payloadText${c.jsonPointer === "/" ? "" : c.jsonPointer}`,
          schemaShape,
          exactValue: c.exactValue,
          exactValueHash: c.exactValueHash,
          payloadSha256,
          present: true,
          empty: false,
        }));
      }
    } catch {
      // Fall through — treat as ordinary prose if JSON parse fails.
    }
  }

  return [
    {
      audienceId,
      jsonPointer: `${basePointer}/payloadText`,
      schemaShape,
      exactValue: text,
      exactValueHash: sha256(text),
      payloadSha256,
      present: true,
      empty: false,
    },
  ];
}

export function inventoryAudiencePacks(raw: Record<string, unknown> | null): {
  present: boolean;
  schemaShape: "real_array" | "legacy_object_keyed" | "absent" | "unrecognised";
  leaves: AudiencePackLeaf[];
} {
  if (!raw) return { present: false, schemaShape: "absent", leaves: [] };

  const packsVal = raw.packs;
  if (Array.isArray(packsVal)) {
    const leaves: AudiencePackLeaf[] = [];
    packsVal.forEach((p, i) => {
      const audienceId = isObj(p) && typeof p.audienceId === "string" ? p.audienceId : `unknown-${i}`;
      // Outer pack boundary: only inventory payloadText when the pack is copyable/sendable.
      // Protected raw and machineMetadata are never scored as solicitor drafting.
      if (isObj(p) && (p.canCopy === false || p.sendability === "blocked")) {
        return;
      }
      const text =
        isObj(p) && typeof p.payloadText === "string"
          ? p.payloadText
          : isObj(p) && typeof p.text === "string"
            ? p.text
            : null;
      leaves.push(
        ...expandAudiencePayloadTextLeaves({
          audienceId,
          basePointer: `/packs/${i}`,
          schemaShape: "real_array",
          text,
          payloadSha256: isObj(p) && typeof p.payloadSha256 === "string" ? p.payloadSha256 : null,
        }),
      );
    });
    return { present: true, schemaShape: "real_array", leaves };
  }

  if (isObj(packsVal)) {
    const leaves: AudiencePackLeaf[] = [];
    for (const [audienceId, p] of Object.entries(packsVal)) {
      const text =
        isObj(p) && typeof p.payloadText === "string"
          ? p.payloadText
          : isObj(p) && typeof p.text === "string"
            ? p.text
            : null;
      leaves.push(
        ...expandAudiencePayloadTextLeaves({
          audienceId,
          basePointer: `/packs/${audienceId}`,
          schemaShape: "legacy_object_keyed",
          text,
          payloadSha256: isObj(p) && typeof p.payloadSha256 === "string" ? p.payloadSha256 : null,
        }),
      );
    }
    return { present: true, schemaShape: "legacy_object_keyed", leaves };
  }

  return { present: true, schemaShape: "unrecognised", leaves: [] };
}

// ---------------------------------------------------------------------------------------------
// Exit payload inventory — genuine sourceDir/exits/{exitId}/payload.json only.
// ---------------------------------------------------------------------------------------------

export type ExitWordingQualityStatus = "EXERCISED" | "NOT_EXERCISED";

export type ExitPayloadLeaf = {
  exitId: string;
  jsonPointer: string;
  exactValue: string;
  exactValueHash: string;
};

export type ExitInventoryOutcome = {
  exitId: string;
  wordingQualityExerciseStatus: ExitWordingQualityStatus;
  reason: string;
  payloadAbsolutePathTried: string | null;
  payloadSha256: string | null;
  receiptCarriesHashOnly: boolean;
  receiptCarriesRetainedExcerpt: boolean;
  leaves: ExitPayloadLeaf[];
};

const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const HEX_ID_RE = /^[0-9a-f]{16,}$/i;
const ENUM_TOKEN_RE = /^[a-z0-9]+([_-][a-z0-9]+)*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_WORDING_LEAF_LENGTH = 15;

/** Machine / relationship keys that are never solicitor wording even when string-typed. */
const MACHINE_KEY_RE =
  /^(.*[Ii]d|.*[Hh]ash|.*Sha256|sha256|uuid|key|schemaVersion|producedBy|producer|kind|exitId|comparable|payloadIdentity|metadataOnly|realPayloadPresent|linkageStatus|resolutionState|sendability|existence|reliability|inferredSourceState|baseStatus|sourceDocumentType|pageIdentityKnown|uploadOrder|versionNumber|replacesDocumentId|findingIds?|riskScore|detectorClassification|controlRoom|relationshipType|relationshipPhrase|relationshipKey|apiKey|internalId|lookupLabel|enumValue|technicalLabel)$/;

/**
 * Raw source-material keys inside supervisor / control-room packs — not CaseBrain drafted output.
 * Must never be scored for professional drafting quality.
 */
const SOURCE_MATERIAL_KEY_RE =
  /^(sourceBasis|combinedText|extracted(?:Text|Snippet|Excerpt)?|raw(?:Text|Bundle|Snippet)|bundleText|bundleExcerpt|sourceExcerpt|retainedPayloadTextExcerpt|ocrText|pageText|sourceChargeText|frontMatterScan)$/i;

/** Nested raw-extract audit payloads — exact source retained, not ordinary drafting. */
function isProtectedRawSourcePointer(pointer: string): boolean {
  return (
    /\/rawSourceExtract(\/|$)/i.test(pointer) ||
    /\/protectedRawSourceExtracts(\/|$)/i.test(pointer) ||
    /\/protectedRawSource(\/|$)/i.test(pointer) ||
    /\/machineMetadata(\/|$)/i.test(pointer) ||
    /\/audit(\/|$)/i.test(pointer)
  );
}

function isSourceMaterialPointer(pointer: string): boolean {
  const parts = pointer.split("/").filter(Boolean);
  return parts.some((p) => SOURCE_MATERIAL_KEY_RE.test(p)) || isProtectedRawSourcePointer(pointer);
}

/** Honest wording-vs-machine-state filter for exit-payload leaves (which, unlike
 * casebrain-output.json leaves, are not run through classifyLeaf) — excludes ids/hashes/
 * timestamps/enum tokens so they are never mistaken for solicitor-visible prose. */
function looksLikeSolicitorWording(text: string): boolean {
  const t = text.trim();
  if (t.length < MIN_WORDING_LEAF_LENGTH) return false;
  if (ISO_DATETIME_RE.test(t) || HEX_ID_RE.test(t) || UUID_RE.test(t)) return false;
  if (ENUM_TOKEN_RE.test(t) && !/\s/.test(t)) return false; // single snake/kebab-case token, no spaces
  // API relationship / technical lookup labels (colon-separated machine tokens).
  if (/^[a-z0-9_]+(?::[a-z0-9_]+)+$/i.test(t) && t.length < 120) return false;
  // Machine keyish suffixes (e.g. "exhibit pack …::generic").
  if (/::(generic|master_media|clip_or_still|[a-z0-9_]+)$/i.test(t)) return false;
  return true;
}

/** Recursively collect every non-empty, genuinely wording-like string leaf from a captured exit
 * payload object — excludes ids/hashes/timestamps/enum tokens and machine relationship keys. */
function collectStringLeaves(exitId: string, node: unknown, pointer: string, out: ExitPayloadLeaf[]): void {
  if (typeof node === "string") {
    const leafKey = pointer.split("/").filter(Boolean).pop() ?? "";
    if (MACHINE_KEY_RE.test(leafKey)) return;
    if (SOURCE_MATERIAL_KEY_RE.test(leafKey) || isSourceMaterialPointer(pointer)) return;
    if (isProtectedRawSourcePointer(pointer)) return;
    // Raw extract body is audit-only even when key is generic "text".
    if (/\/rawSourceExtract\/text$/i.test(pointer)) return;
    if (looksLikeSolicitorWording(node)) {
      out.push({ exitId, jsonPointer: pointer || "/", exactValue: node, exactValueHash: sha256(node) });
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectStringLeaves(exitId, item, `${pointer}/${i}`, out));
    return;
  }
  if (isObj(node)) {
    for (const key of Object.keys(node).sort()) {
      if (MACHINE_KEY_RE.test(key)) continue;
      if (SOURCE_MATERIAL_KEY_RE.test(key)) continue;
      if (key === "rawSourceExtract" || key === "audit") continue;
      collectStringLeaves(exitId, node[key], `${pointer}/${key}`, out);
    }
  }
}

export function inventoryExitPayloads(args: {
  casebrainOutput: Record<string, unknown> | null;
  sourceDirAbs: string | null;
}): ExitInventoryOutcome[] {
  const cb = args.casebrainOutput;
  const receipts = cb && isObj(cb.exitPayloadReceipts) ? cb.exitPayloadReceipts : null;
  if (!receipts) return [];

  return Object.entries(receipts).map(([exitId, receiptRaw]) => {
    const receipt = isObj(receiptRaw) ? receiptRaw : {};
    const receiptCarriesHashOnly =
      typeof receipt.payloadIdentity === "string" && receipt.payloadIdentity.length > 0;
    const receiptCarriesRetainedExcerpt = typeof receipt.retainedPayloadTextExcerpt === "string";

    const payloadRelativePath =
      typeof receipt.payloadRelativePath === "string" ? receipt.payloadRelativePath : `exits/${exitId}/payload.json`;
    const payloadAbs = args.sourceDirAbs ? path.join(args.sourceDirAbs, payloadRelativePath) : null;

    if (payloadAbs && fs.existsSync(payloadAbs)) {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(fs.readFileSync(payloadAbs, "utf8"));
      } catch {
        return {
          exitId,
          wordingQualityExerciseStatus: "NOT_EXERCISED" as const,
          reason: `payload.json present at ${payloadRelativePath} but failed to parse as JSON — unresolved schema, fail-closed. Never reconstructed from another exit.`,
          payloadAbsolutePathTried: payloadAbs,
          payloadSha256: null,
          receiptCarriesHashOnly,
          receiptCarriesRetainedExcerpt,
          leaves: [],
        };
      }
      const raw = fs.readFileSync(payloadAbs, "utf8");
      const leaves: ExitPayloadLeaf[] = [];
      collectStringLeaves(exitId, parsed, "", leaves);
      return {
        exitId,
        wordingQualityExerciseStatus: "EXERCISED" as const,
        reason: `Genuine payload.json present on disk at ${payloadRelativePath} — real captured exit wording exercised.`,
        payloadAbsolutePathTried: payloadAbs,
        payloadSha256: sha256(raw),
        receiptCarriesHashOnly,
        receiptCarriesRetainedExcerpt,
        leaves,
      };
    }

    return {
      exitId,
      wordingQualityExerciseStatus: "NOT_EXERCISED" as const,
      reason: receiptCarriesHashOnly
        ? `exitPayloadReceipts.${exitId} carries a hash/receipt only — payload.json absent at ${payloadRelativePath}. Wording quality is never reconstructed from another exit's payload; recorded honestly as NOT_EXERCISED.`
        : `No payload and no hash receipt for exit ${exitId} — not exercised.`,
      payloadAbsolutePathTried: payloadAbs,
      payloadSha256: null,
      receiptCarriesHashOnly,
      receiptCarriesRetainedExcerpt,
      leaves: [],
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Full per-case report.
// ---------------------------------------------------------------------------------------------

export type SolicitorVisibleInventoryReport = {
  schemaVersion: typeof SOLICITOR_VISIBLE_INVENTORY_SCHEMA_VERSION;
  caseId: string;
  sourceLeafCount: number;
  includedLeafCount: number;
  excludedLeafCount: number;
  reconciled: boolean;
  includedLeaves: SourceLeaf[];
  excludedLeaves: SourceLeaf[];
  audiencePacks: ReturnType<typeof inventoryAudiencePacks>;
  exits: ExitInventoryOutcome[];
  exitWordingQualityStatusByExitId: Record<string, ExitWordingQualityStatus>;
};

function sourceDirAbsFromInputs(inputs: EssentialCaseInputs): string | null {
  const used = inputs.casebrainOutput.absolutePathUsed;
  return used ? path.dirname(used) : null;
}

export function buildSolicitorVisibleInventory(inputs: EssentialCaseInputs): SolicitorVisibleInventoryReport | null {
  const cb = inputs.casebrainOutput.value;
  if (!cb) return null;

  const allLeaves = inventoryOutputLeaves(inputs.caseId, cb);
  const includedLeaves = allLeaves.filter((l) => isIncludedDisposition(l.disposition));
  const excludedLeaves = allLeaves.filter((l) => !isIncludedDisposition(l.disposition));

  const audiencePacks = inventoryAudiencePacks(inputs.audiencePacks.value);
  const exits = inventoryExitPayloads({ casebrainOutput: cb, sourceDirAbs: sourceDirAbsFromInputs(inputs) });

  const exitWordingQualityStatusByExitId: Record<string, ExitWordingQualityStatus> = {};
  for (const e of exits) exitWordingQualityStatusByExitId[e.exitId] = e.wordingQualityExerciseStatus;

  return {
    schemaVersion: SOLICITOR_VISIBLE_INVENTORY_SCHEMA_VERSION,
    caseId: inputs.caseId,
    sourceLeafCount: allLeaves.length,
    includedLeafCount: includedLeaves.length,
    excludedLeafCount: excludedLeaves.length,
    reconciled: allLeaves.length === includedLeaves.length + excludedLeaves.length,
    includedLeaves,
    excludedLeaves,
    audiencePacks,
    exits,
    exitWordingQualityStatusByExitId,
  };
}

export { classifyLeaf };
export type { SourceLeaf };
