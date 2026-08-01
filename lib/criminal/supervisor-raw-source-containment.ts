/**
 * Supervisor / control-room raw-source containment.
 *
 * Exact original source bytes are retained for provenance/audit, but must never appear
 * inside ordinary AudiencePack.payloadText (copy/export/send). Protected extracts are
 * stored as separate audit records with enforceable outer boundaries.
 */

import crypto from "node:crypto";

import {
  looksLikeHarnessOrMalformedSource,
  stripInternalCorpusIdentifiers,
} from "@/lib/criminal/solicitor-visible-matter-reference";

export const RAW_SOURCE_EXTRACT_LABEL = "Raw source extract — unverified" as const;

export const RAW_SOURCE_EXTRACT_LIMITATION =
  "This extract is unverified source or harness material retained for audit. It is not solicitor drafting. Do not copy or send. Review the source papers before relying on any summary.";

/** Solicitor-copyable limitation — no machine/audit/harness terminology. */
export const RAW_SOURCE_EXTRACT_COPY_LIMITATION =
  "An unverified source extract is retained in the labelled review section only. It is not solicitor drafting. Do not copy or send it. Review the source papers before relying on any summary.";

export type ProtectedRawSourceExtract = {
  kind: "protected_raw_source_extract";
  label: typeof RAW_SOURCE_EXTRACT_LABEL;
  /** Exact original source bytes — never silently rewritten. */
  text: string;
  sha256: string;
  /** Stable pointer for linking from professional payload / packs (no text embedded). */
  pointer: string;
  canCopy: false;
  sendability: "blocked";
  sendabilityLabel: "Not for copy or send";
  excludedFromExport: true;
  excludedFromApiProse: true;
  excludedFromPdf: true;
  excludedFromComposedProse: true;
  provenance: string;
  limitation: string;
};

/** Professional-only supervisor payload — never embeds exact raw source text. */
export type ContainedSupervisorAudiencePayload = {
  kind: "supervisor_risk_contained";
  professionalSummary: string;
  findingsPreview: Array<{ kind?: string; summary: string }>;
  limitations: string[];
  /** Hash/pointer only — opens the labelled review control; not the raw bytes. */
  protectedRawSourcePointer: string | null;
  audit: {
    exactRawSourceRetained: boolean;
    rawSourceSha256: string | null;
    rawSourceByteLength: number;
    harnessOrMalformedDetected: boolean;
  };
};

export type ContainedSupervisorAudienceBundle = {
  professionalPayload: ContainedSupervisorAudiencePayload;
  protectedRawSource: ProtectedRawSourceExtract | null;
};

function sha256Hex(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function professionalLimitationSummary(): string {
  return [
    "Supervisor review required.",
    "A raw source extract is available in the labelled review section — it is not ordinary solicitor drafting.",
    "Action: review the source papers and replace any unverified or corrupted fragments before relying on hearing position.",
  ].join(" ");
}

/** Machine / developer terms that must never appear in solicitor-copyable supervisor prose. */
export const SUPERVISOR_COPY_MACHINE_TERMS_RE =
  /\b(supervisor_risk_contained|document_role|draft_vs_signed|rawSourceSha256|rawSourceByteLength|harnessOrMalformedDetected|protectedRawSourcePointer|exactRawSourceRetained|findingsPreview|professionalSummary|payloadSha256|schemaVersion|jsonPointer|controlRoom|frontMatterScan)\b|["']audit["']|\b"audit"\b|\baudit\s*:\s*\{/i;

function isProfessionalStatusPhrase(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  if (/^[a-z0-9]+([_-][a-z0-9]+)+$/i.test(t) && !/\s/.test(t)) return false; // snake/kebab enum
  return true;
}

function sanitizeFindingSummaries(
  findings: Array<{ kind?: string; summary?: string | null }> | null | undefined,
): Array<{ kind?: string; summary: string }> {
  const out: Array<{ kind?: string; summary: string }> = [];
  for (const f of (findings ?? []).slice(0, 8)) {
    const summary = stripInternalCorpusIdentifiers((f.summary ?? "").trim());
    if (!summary || looksLikeHarnessOrMalformedSource(summary)) continue;
    out.push({ kind: f.kind, summary });
  }
  return out;
}

export function buildProtectedRawSourceExtract(exactRawSource: string): ProtectedRawSourceExtract {
  const text = exactRawSource; // exact bytes — never rewritten
  const digest = sha256Hex(text);
  return {
    kind: "protected_raw_source_extract",
    label: RAW_SOURCE_EXTRACT_LABEL,
    text,
    sha256: digest,
    pointer: `protected-raw:${digest.slice(0, 16)}`,
    canCopy: false,
    sendability: "blocked",
    sendabilityLabel: "Not for copy or send",
    excludedFromExport: true,
    excludedFromApiProse: true,
    excludedFromPdf: true,
    excludedFromComposedProse: true,
    provenance:
      "Retained exactly from bundle front-matter / combined source text for audit and provenance.",
    limitation: RAW_SOURCE_EXTRACT_LIMITATION,
  };
}

/**
 * Build professional supervisor payload + separate protected raw extract.
 * Exact raw is never placed in the professional payload object.
 */
export function buildContainedSupervisorAudienceBundle(args: {
  exactRawSource?: string | null;
  findings?: Array<{ kind?: string; summary?: string | null }> | null;
  readinessLabel?: string | null;
  qaStatus?: string | null;
}): ContainedSupervisorAudienceBundle {
  const exact = args.exactRawSource ?? "";
  const harness = looksLikeHarnessOrMalformedSource(exact);
  const findingsPreview = sanitizeFindingSummaries(args.findings);
  const protectedRawSource = exact.trim() ? buildProtectedRawSourceExtract(exact) : null;

  const readiness =
    args.readinessLabel && isProfessionalStatusPhrase(args.readinessLabel)
      ? stripInternalCorpusIdentifiers(args.readinessLabel)
      : null;
  const qa =
    args.qaStatus && isProfessionalStatusPhrase(args.qaStatus)
      ? stripInternalCorpusIdentifiers(args.qaStatus)
      : null;

  let professionalSummary: string;
  if (findingsPreview.length > 0 && !harness) {
    professionalSummary = [
      readiness ? `Readiness: ${readiness}.` : null,
      qa ? `Quality review status: ${qa}.` : null,
      "Supported findings are listed below. Confirm against the source papers before fixing hearing position.",
    ]
      .filter(Boolean)
      .join(" ");
  } else if (harness || exact.trim()) {
    professionalSummary = professionalLimitationSummary();
  } else {
    professionalSummary =
      "Limited supervisor signals on current papers. Review the source bundle before fixing hearing position.";
  }

  const limitations: string[] = [];
  if (protectedRawSource) {
    // Machine metadata may keep the longer audit-oriented limitation; copy prose uses the copy-safe form.
    limitations.push(RAW_SOURCE_EXTRACT_COPY_LIMITATION);
  }
  if (harness) {
    limitations.push(
      "Unverified or corrupted source markers were detected in the retained extract — do not treat as solicitor drafting.",
    );
  }

  const professionalPayload: ContainedSupervisorAudiencePayload = {
    kind: "supervisor_risk_contained",
    professionalSummary,
    findingsPreview,
    limitations,
    protectedRawSourcePointer: protectedRawSource?.pointer ?? null,
    audit: {
      exactRawSourceRetained: Boolean(protectedRawSource),
      rawSourceSha256: protectedRawSource?.sha256 ?? null,
      rawSourceByteLength: exact.length,
      harnessOrMalformedDetected: harness,
    },
  };

  return { professionalPayload, protectedRawSource };
}

/** @deprecated Prefer buildContainedSupervisorAudienceBundle — professional payload only. */
export function buildContainedSupervisorAudiencePayload(args: {
  exactRawSource?: string | null;
  findings?: Array<{ kind?: string; summary?: string | null }> | null;
  readinessLabel?: string | null;
  qaStatus?: string | null;
}): ContainedSupervisorAudiencePayload {
  return buildContainedSupervisorAudienceBundle(args).professionalPayload;
}

export function serializeContainedSupervisorAudiencePayload(
  payload: ContainedSupervisorAudiencePayload,
): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/**
 * Plain professional prose for solicitor clipboard/export.
 * Never includes JSON keys, machine enums, hashes, byte lengths, or audit structures.
 */
export function formatSupervisorProfessionalCopyText(
  payload: ContainedSupervisorAudiencePayload,
): string {
  const lines: string[] = [];
  const summary = (payload.professionalSummary ?? "").trim();
  if (summary) lines.push(summary);

  const findings = (payload.findingsPreview ?? [])
    .map((f) => stripInternalCorpusIdentifiers((f.summary ?? "").trim()))
    .filter((s) => s && !looksLikeHarnessOrMalformedSource(s) && !SUPERVISOR_COPY_MACHINE_TERMS_RE.test(s));
  if (findings.length > 0) {
    lines.push("");
    lines.push("Supported findings:");
    for (const f of findings) lines.push(`• ${f}`);
  }

  const limitations = (payload.limitations ?? [])
    .map((l) => stripInternalCorpusIdentifiers(l.trim()))
    .filter((l) => l && !SUPERVISOR_COPY_MACHINE_TERMS_RE.test(l));
  if (limitations.length > 0) {
    lines.push("");
    lines.push("Limitations:");
    for (const l of limitations) lines.push(`• ${l}`);
  }

  lines.push("");
  lines.push(
    "Required action: review the source papers before relying on or sending any hearing position derived from this summary.",
  );

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/**
 * Clipboard / export / send surface for an audience pack.
 * Returns null when blocked. For supervisor packs, returns plain professional prose only
 * (never structured JSON / machine metadata).
 */
export function audiencePackCopyablePayloadText(pack: {
  audienceId?: string;
  payloadText: string;
  canCopy?: boolean;
  sendability?: string;
  professionalCopyText?: string | null;
}): string | null {
  if (pack.canCopy === false) return null;
  if (pack.sendability === "blocked") return null;
  const preferred = (pack.professionalCopyText ?? "").trim();
  if (preferred) return preferred.endsWith("\n") ? preferred : `${preferred}\n`;
  // Supervisor payloadText must already be prose; never return JSON-shaped blobs as copy.
  const text = pack.payloadText ?? "";
  if (
    pack.audienceId === "supervisor" &&
    (text.trimStart().startsWith("{") || SUPERVISOR_COPY_MACHINE_TERMS_RE.test(text))
  ) {
    return null;
  }
  return text;
}

export function containsSupervisorCopyMachineTerminology(text: string | null | undefined): boolean {
  return SUPERVISOR_COPY_MACHINE_TERMS_RE.test(text ?? "");
}

/** True when text contains fixture / harness / corpus language that must not leave on copy/export. */
export function containsInternalOrHarnessLanguage(text: string | null | undefined): boolean {
  const t = text ?? "";
  if (!t) return false;
  if (looksLikeHarnessOrMalformedSource(t)) return true;
  if (
    /\b(s150-[a-z0-9_-]+|s300-[a-z0-9_-]+|S300-[a-z0-9_-]+|UQ-[a-z0-9_-]+|demo-audit-\d+|Stage-300|matter token|specialty_[a-z0-9_]+)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}
