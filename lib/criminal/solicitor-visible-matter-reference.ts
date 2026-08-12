/**
 * Solicitor-visible matter / export identity — shared boundary rules.
 *
 * Internal corpus/test case IDs (s150-*, s300-*, demo-audit, …) must never appear in
 * solicitor-facing view/copy/export/PDF/API prose. Prefer a source-backed URN; otherwise omit.
 * Machine/audit metadata may still retain the internal caseId.
 */

import { isFixtureIdLike } from "@/lib/criminal/solicitor-visible-sanitization";

/** Fixture / corpus / run identifiers that must not appear in solicitor-visible prose. */
export const INTERNAL_CORPUS_ID_TOKEN_RE =
  /\b(?:s150-[a-z0-9_-]+|s300-[a-z0-9_-]+|S300-[a-z0-9_-]+|UQ-[a-z0-9_-]+|demo-audit-\d+|cb-(?:fresh|found)-\d+|cb-(?:(?:murder-test|test|tb|40x40|thin|gold)[a-z0-9_-]*)|contract-fixture-[a-z0-9_-]+|GOLD-11|SYN-[A-Z0-9-]+)\b/gi;

/** Evaluation filenames may identify a QA corpus even when the internal case ID is absent. */
export const INTERNAL_EVALUATION_FILENAME_RE =
  /\bCB-[A-Z0-9][A-Z0-9 _().,&'’+\-]{2,180}\.pdf\b/gi;

export const HARNESS_CORPUS_LANGUAGE_RE =
  /\b(?:Stage-300|stage-300|stage300|Format notes:|control-coverage materialisation|Coverage (?:family|tag):|matter token|specialty_[a-z0-9_]+|ocr_binary_heavy|new-150)\b/i;

const URN_RE = /\bURN:\s*([0-9A-Z]{6,})\b/i;

/** Machine / audit keys — retain internal IDs; do not rewrite as solicitor prose. */
export const SOLICITOR_VISIBLE_MACHINE_KEYS = new Set([
  "caseId",
  "internalCaseId",
  "id",
  "key",
  "runId",
  "version",
  "exportId",
  "sourceChargeText",
  "sourcePath",
  "fixtureId",
  "requestId",
  "evidenceUnitId",
]);

/** Nested objects that preserve exact raw / audit bytes. */
export const SOLICITOR_VISIBLE_PROTECTED_OBJECT_KEYS = new Set([
  "rawSourceExtract",
  "protectedRawSourceExtracts",
  "audit",
  "frontMatterScan",
]);

/** Non-crypto opaque token — safe for client bundles; never embeds fixture IDs. */
function opaqueExportToken(internalCaseId: string, generatedAt: string): string {
  let h = 2166136261;
  const s = `solicitor-export|${internalCaseId}|${generatedAt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function isInternalCorpusOrFixtureCaseId(id: string | null | undefined): boolean {
  const t = (id ?? "").trim();
  if (!t) return false;
  if (isFixtureIdLike(t)) return true;
  if (/^(s150-|s300-|uq-|demo-audit-|cb-(?:fresh|found)-|contract-fixture-)/i.test(t)) return true;
  if (/^S300-/i.test(t)) return true;
  INTERNAL_CORPUS_ID_TOKEN_RE.lastIndex = 0;
  return INTERNAL_CORPUS_ID_TOKEN_RE.test(t);
}

/** Extract a genuine source-backed URN from papers text. Never invents. */
export function extractSourceBackedUrn(...texts: Array<string | null | undefined>): string | null {
  for (const text of texts) {
    const m = (text ?? "").match(URN_RE);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

/**
 * Visible matter reference for solicitor stamps — URN only when source-backed.
 * Returns null when no safe professional reference exists (caller omits the line).
 */
export function resolveSolicitorVisibleMatterReference(args: {
  caseId?: string | null;
  matterReference?: string | null;
  urnCandidates?: Array<string | null | undefined>;
}): string | null {
  const explicit = (args.matterReference ?? "").trim();
  if (explicit && !isInternalCorpusOrFixtureCaseId(explicit) && !HARNESS_CORPUS_LANGUAGE_RE.test(explicit)) {
    return explicit;
  }
  const urn = extractSourceBackedUrn(...(args.urnCandidates ?? []));
  if (urn) return `URN ${urn}`;
  // Never fall back to fixture caseId.
  if (args.caseId && !isInternalCorpusOrFixtureCaseId(args.caseId)) {
    return args.caseId;
  }
  return null;
}

/**
 * Opaque export id for solicitor-visible stamps.
 * Uniqueness may hash the internal caseId, but the visible token never embeds fixture IDs.
 */
export function makeSolicitorVisibleExportId(args: {
  generatedAt: string;
  internalCaseId?: string | null;
  matterUrn?: string | null;
}): string {
  const t = args.generatedAt.replace(/[^\d]/g, "").slice(0, 14) || "00000000000000";
  const urn = (args.matterUrn ?? "").trim();
  if (urn && !isInternalCorpusOrFixtureCaseId(urn)) {
    const safe = urn.replace(/[^A-Za-z0-9]/g, "").slice(0, 12) || "matter";
    return `exp-${safe}-${t}`;
  }
  const opaque = opaqueExportToken(args.internalCaseId ?? "unknown", args.generatedAt);
  return `exp-${opaque}-${t}`;
}

/** Remove harness / corpus-generation phrases from solicitor-visible prose. */
export function scrubHarnessCorpusLanguage(text: string): string {
  return text
    .replace(/\bMatter token(?:\s+\S+)?\.?/gi, "")
    .replace(/\bCoverage (?:family|tag):\s*\S+/gi, "")
    .replace(/\bFormat (?:variant|notes):\s*[^\n.]+/gi, "")
    .replace(/\b(?:Stage-300|stage-300|stage300|ocr_binary_heavy|new-150)\b/gi, "")
    .replace(/\bcontrol-coverage materialisation\b/gi, "")
    .replace(/\bspecialty_[a-z0-9_]+\b/gi, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s+-\s+/g, " — ")
    .replace(/^[—\-\s]+|[—\-\s]+$/g, "")
    .trim();
}

/** Strip internal corpus/fixture ID tokens and harness language from solicitor-visible prose/labels. */
export function stripInternalCorpusIdentifiers(text: string): string {
  return scrubHarnessCorpusLanguage(
    text
      // Preserve the fact that a source exists without exposing its QA filename.
      .replace(INTERNAL_EVALUATION_FILENAME_RE, "Source bundle")
      .replace(INTERNAL_CORPUS_ID_TOKEN_RE, "")
      .replace(/\(\s*\)/g, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([,.;:])/g, "$1")
      .trim(),
  );
}

export function looksLikeHarnessOrMalformedSource(text: string | null | undefined): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  if (HARNESS_CORPUS_LANGUAGE_RE.test(t)) return true;
  INTERNAL_CORPUS_ID_TOKEN_RE.lastIndex = 0;
  if (INTERNAL_CORPUS_ID_TOKEN_RE.test(t) && /RESTRICTED|SECTION:|Coverage family|matter token/i.test(t)) {
    return true;
  }
  // Observed harness corruption: unclosed / stray backticks in decision lines.
  if (/decision\s+"?\s*[`']+\s*guilt/i.test(t)) return true;
  if (/decision\s+"`\s*guilt/i.test(t)) return true;
  return false;
}

const UNVERIFIED_ANCHOR_FALLBACK =
  "Source extract retained for audit — unverified. Confirm against the papers before relying on this anchor.";

/**
 * Solicitor-visible source/evidence anchor.
 * Strips fixture/harness tokens; if the extract remains harness-like, replace with a limitation
 * (exact raw belongs in protected audit / labelled raw-source extract — not ordinary drafting).
 */
export function sanitizeSolicitorVisibleAnchor(text: string | null | undefined): string | null {
  const raw = (text ?? "").trim();
  if (!raw) return null;
  const cleaned = stripInternalCorpusIdentifiers(raw);
  if (!cleaned) return UNVERIFIED_ANCHOR_FALLBACK;
  if (looksLikeHarnessOrMalformedSource(cleaned) || looksLikeHarnessOrMalformedSource(raw)) {
    // Prefer cleaned short excerpt when scrub removed the harness markers.
    INTERNAL_CORPUS_ID_TOKEN_RE.lastIndex = 0;
    HARNESS_CORPUS_LANGUAGE_RE.lastIndex = 0;
    if (!HARNESS_CORPUS_LANGUAGE_RE.test(cleaned) && !INTERNAL_CORPUS_ID_TOKEN_RE.test(cleaned)) {
      return cleaned.length > 280 ? `${cleaned.slice(0, 277).trimEnd()}…` : cleaned;
    }
    return UNVERIFIED_ANCHOR_FALLBACK;
  }
  return cleaned.length > 320 ? `${cleaned.slice(0, 317).trimEnd()}…` : cleaned;
}

/**
 * Deep-sanitize solicitor-visible JSON trees (view/copy/export/api/pdf/composed).
 * Preserves machine keys and protected raw/audit objects byte-for-byte.
 */
export function sanitizeSolicitorVisibleValueTree(value: unknown, keyHint = ""): unknown {
  if (typeof value === "string") {
    if (/sourceChargeText/i.test(keyHint)) return value;
    if (/sourceAnchor|evidenceAnchor/i.test(keyHint)) {
      return sanitizeSolicitorVisibleAnchor(value) ?? value;
    }
    return stripInternalCorpusIdentifiers(value);
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeSolicitorVisibleValueTree(v, keyHint));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SOLICITOR_VISIBLE_PROTECTED_OBJECT_KEYS.has(k)) {
        out[k] = v;
        continue;
      }
      if (SOLICITOR_VISIBLE_MACHINE_KEYS.has(k)) {
        out[k] = v;
        continue;
      }
      out[k] = sanitizeSolicitorVisibleValueTree(v, k);
    }
    return out;
  }
  return value;
}
