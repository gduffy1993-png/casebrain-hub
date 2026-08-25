/**
 * Canonical document-relationship model (shared application logic).
 * Preserves operative/amended/superseded states, draft vs signed field diffs,
 * referenced-but-absent attachments, aliases without collapse, and exhibit collisions.
 * Generic rules only — no fixture- or matter-specific branches.
 */

import {
  evidenceAliasKeyForLabel,
  evidenceScopeTags,
  scopesCompatible,
  type EvidenceScopeTag,
} from "@/lib/criminal/evidence-alias-dedupe";
import {
  inferEvidenceModality,
  evidenceScopeOfLabel,
  reconcileEvidenceState,
  type EvidenceModality,
  type SharedEvidenceState,
} from "@/lib/criminal/evidence-state-reconcile";

export type DocumentLifecycleRole = "operative" | "amended" | "superseded" | "unknown";

export type DocumentVersionKind = "draft" | "unsigned" | "signed_final" | "unknown";

export type ChangedFieldRecord = {
  field: string;
  earlierValue: string;
  laterValue: string;
};

export type DocumentRelationshipNode = {
  id: string;
  title: string | null;
  documentType: string | null;
  role: DocumentLifecycleRole;
  versionKind: DocumentVersionKind;
  /** Earlier / superseded node this amends or replaces — values preserved, not overwritten. */
  earlierDocumentId: string | null;
  /** Explicit replacement linkage (this document replaces that id). */
  replacesDocumentId: string | null;
  /** ISO date or sortable document date string when known. */
  documentDate: string | null;
  /** Explicit version number when known (higher wins). */
  versionNumber: number | null;
  /** Upload / appearance order (higher = later). Never sole selector when dates/versions exist. */
  uploadOrder: number;
  changedFields: ChangedFieldRecord[];
  modality: EvidenceModality;
  scopeTags: EvidenceScopeTag[];
  evidenceState: SharedEvidenceState;
  aliasFamilyKey: string | null;
  exhibitLabel: string | null;
  sourcePage: string | null;
  compiledPage: string | null;
  /** False when the document was supplied as unsplit whole-document text. */
  pageIdentityKnown: boolean;
};

export type ReferencedAbsentAttachment = {
  referencedLabel: string;
  referencedIn: string;
  onFileState: "absent" | "missing" | "referred_only";
};

export type ExhibitLabelCollision = {
  label: string;
  occurrences: string[];
};

export type DocumentRelationshipGraph = {
  nodes: DocumentRelationshipNode[];
  referencedAbsentAttachments: ReferencedAbsentAttachment[];
  exhibitCollisions: ExhibitLabelCollision[];
  /** Alias families expanded for display — never used to hide distinct units. */
  aliasFamilies: Array<{ familyKey: string; labels: string[] }>;
};

export function inferDocumentLifecycleRole(hay: string): DocumentLifecycleRole {
  const t = hay.toLowerCase();
  if (/\bsuperseded\b|\breplaced by\b|\boriginal indictment\b|\bearlier indictment\b|\bdraft charge\b/.test(t)) {
    return "superseded";
  }
  if (/\bamended (?:indictment|charge|information)\b|\bamending\b/.test(t)) {
    return "amended";
  }
  if (/\boperative\b|\bcharge sheet\b|\bindictment\b|\binformation\b/.test(t)) {
    return "operative";
  }
  return "unknown";
}

export function inferDocumentVersionKind(hay: string): DocumentVersionKind {
  const t = hay.toLowerCase();
  if (/\b(final\s+signed|signed\s+mg11|signed\s+statement|final\s+statement)\b/.test(t)) {
    return "signed_final";
  }
  if (/\bunsigned\b/.test(t)) return "unsigned";
  if (/\bdraft\b/.test(t)) return "draft";
  return "unknown";
}

/**
 * Detect draft-versus-signed field changes.
 * Preserves earlier (draft) values alongside later (signed) values — never overwrites.
 */
export function detectDraftVersusSignedChanges(input: {
  draftText: string;
  signedText: string;
  fields?: Array<{ field: string; draftPattern: RegExp; signedPattern?: RegExp }>;
}): ChangedFieldRecord[] {
  const defaults: Array<{ field: string; draftPattern: RegExp; signedPattern?: RegExp }> = [
    {
      field: "clothing",
      draftPattern: /(?:wearing|clothing|dressed in|garments?)[:\s]+([^\n.;]{4,80})/i,
    },
    {
      field: "location",
      draftPattern: /(?:at|location|place)[:\s]+([^\n.;]{4,80})/i,
    },
    {
      field: "time",
      draftPattern: /(?:at\s+about|approximately|time)[:\s]+([0-9]{1,2}[:.][0-9]{2}(?:\s*[ap]m)?)/i,
    },
  ];
  const fields = input.fields ?? defaults;
  const out: ChangedFieldRecord[] = [];
  for (const f of fields) {
    const d = input.draftText.match(f.draftPattern)?.[1]?.trim();
    const s = input.signedText.match(f.signedPattern ?? f.draftPattern)?.[1]?.trim();
    if (!d || !s) continue;
    if (normalizeFieldValue(d) === normalizeFieldValue(s)) continue;
    out.push({ field: f.field, earlierValue: d, laterValue: s });
  }
  return out;
}

function normalizeFieldValue(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Referenced-but-absent attachments (index/email/exhibit list mentions with no on-file unit).
 */
export function detectReferencedAbsentAttachments(
  text: string,
  onFileLabels: string[],
): ReferencedAbsentAttachment[] {
  const refs: ReferencedAbsentAttachment[] = [];
  const patterns: Array<{ re: RegExp; referencedIn: string }> = [
    {
      re: /\b(?:attachment|attached|enclosed)\b\s*[:\-]?\s*([A-Za-z0-9][^\n.;,]{3,60})/gi,
      referencedIn: "narrative",
    },
    {
      re: /\b(?:see|refer(?:red)?\s+to)\s+(?:exhibit|attachment)\s+([A-Za-z0-9/.\-]{1,40})/gi,
      referencedIn: "exhibit_list",
    },
    {
      re: /\b(?:index|schedule)\s+(?:entry|item)\s*[:\-]?\s*([^\n.;]{3,60})/gi,
      referencedIn: "index",
    },
  ];
  const onFileKeys = new Set(onFileLabels.map((l) => normalizeFieldValue(l)).filter(Boolean));

  for (const { re, referencedIn } of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const label = (m[1] ?? "").replace(/\s+/g, " ").trim();
      if (label.length < 3) continue;
      if (/^(s|ed|ing)\b/i.test(label)) continue;
      const key = normalizeFieldValue(label);
      if (onFileKeys.has(key)) continue;
      // Explicit absence language is required — never manufacture absence from a bare reference.
      const window = text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 80);
      const absent = /\b(not\s+(?:attached|enclosed|served|provided|on\s+file)|absent|missing|to\s+follow|attachment\s+not\s+on\s+file)\b/i.test(
        window,
      );
      if (!absent) continue;
      if (refs.some((r) => normalizeFieldValue(r.referencedLabel) === key)) continue;
      refs.push({
        referencedLabel: label,
        referencedIn,
        onFileState: "absent",
      });
    }
  }
  return refs;
}

/**
 * Exhibit-label collisions: same exhibit label bound to genuinely different descriptions.
 */
export function detectExhibitLabelCollisions(
  entries: Array<{ label: string; description: string }>,
): ExhibitLabelCollision[] {
  const byLabel = new Map<string, string[]>();
  for (const e of entries) {
    const lab = e.label.replace(/\s+/g, " ").trim();
    if (!lab) continue;
    const key = lab.toUpperCase();
    const list = byLabel.get(key) ?? [];
    const desc = e.description.replace(/\s+/g, " ").trim();
    if (desc && !list.some((d) => normalizeFieldValue(d) === normalizeFieldValue(desc))) {
      list.push(desc);
    }
    byLabel.set(key, list);
  }
  const collisions: ExhibitLabelCollision[] = [];
  for (const [label, occurrences] of byLabel) {
    if (occurrences.length >= 2) {
      collisions.push({ label, occurrences });
    }
  }
  return collisions;
}

/**
 * Expand alias families without collapsing genuinely different units
 * (different scope tags or existence states stay separate).
 */
export function expandAliasesWithoutCollapse(
  rows: Array<{ label: string; state: SharedEvidenceState }>,
): Array<{ familyKey: string; labels: string[] }> {
  const families = new Map<string, string[]>();
  for (const row of rows) {
    const key = evidenceAliasKeyForLabel(row.label) || `solo:${normalizeFieldValue(row.label)}`;
    const list = families.get(key) ?? [];
    if (!list.includes(row.label)) list.push(row.label);
    families.set(key, list);
  }
  // Filter: only report families that have 2+ labels AND compatible scopes across members
  // that are NOT collapsed (we expose the group for reconciliation, not for merge).
  return [...families.entries()]
    .filter(([, labels]) => labels.length >= 2)
    .map(([familyKey, labels]) => ({ familyKey, labels }));
}

/**
 * Whether a request label is proved by an already-served alias (same family + compatible scope).
 * Master/clip and recording/transcript never qualify as the same unit.
 */
export function aliasProvesSameServedItem(
  request: { label: string; state?: SharedEvidenceState },
  served: { label: string; state: SharedEvidenceState },
): boolean {
  if (served.state !== "served") return false;
  const keyA = evidenceAliasKeyForLabel(request.label);
  const keyB = evidenceAliasKeyForLabel(served.label);
  if (!keyA || keyA !== keyB) return false;
  const scopesA = evidenceScopeTags(request.label);
  const scopesB = evidenceScopeTags(served.label);
  if (!scopesCompatible(scopesA, scopesB)) return false;
  // A served part does not prove a request for the whole, even when they share a family token.
  if (evidenceScopeOfLabel(request.label) === "whole" && evidenceScopeOfLabel(served.label) === "part") {
    return false;
  }
  const modA = inferEvidenceModality(request.label);
  const modB = inferEvidenceModality(served.label);
  if (modA === "master_media" && modB === "clip_or_still") return false;
  if (modB === "master_media" && modA === "clip_or_still") return false;
  if (modA === "recording" && modB === "transcript") return false;
  if (modB === "recording" && modA === "transcript") return false;
  if (modA !== "generic" && modB !== "generic" && modA !== modB) {
    const permitted =
      (modA === "interview" && modB === "recording") ||
      (modB === "interview" && modA === "recording") ||
      (modA === "bwv" && modB === "recording") ||
      (modB === "bwv" && modA === "recording");
    if (!permitted) return false;
  }
  if (modA === "generic" || modB === "generic") {
    // Generic alone is insufficient unless exact/near-exact label match after alias key.
    if (normalizeFieldValue(request.label) !== normalizeFieldValue(served.label) && keyA.startsWith("solo:")) {
      return false;
    }
  }
  return true;
}

export function buildDocumentRelationshipNode(input: {
  id: string;
  title?: string | null;
  documentType?: string | null;
  haystack: string;
  earlierDocumentId?: string | null;
  replacesDocumentId?: string | null;
  documentDate?: string | null;
  versionNumber?: number | null;
  uploadOrder?: number;
  changedFields?: ChangedFieldRecord[];
  evidenceState?: SharedEvidenceState | string | null;
  sourcePage?: string | null;
  compiledPage?: string | null;
  pageIdentityKnown?: boolean;
  exhibitLabel?: string | null;
}): DocumentRelationshipNode {
  const hay = `${input.title ?? ""} ${input.haystack}`;
  const pageIdentityKnown = input.pageIdentityKnown !== false;
  return {
    id: input.id,
    title: input.title?.trim() || null,
    documentType: input.documentType?.trim() || null,
    role: inferDocumentLifecycleRole(hay),
    versionKind: inferDocumentVersionKind(hay),
    earlierDocumentId: input.earlierDocumentId ?? null,
    replacesDocumentId: input.replacesDocumentId ?? null,
    documentDate: input.documentDate?.trim() || extractDocumentDate(hay),
    versionNumber: input.versionNumber ?? extractVersionNumber(hay),
    uploadOrder: input.uploadOrder ?? 0,
    changedFields: input.changedFields ?? [],
    modality: inferEvidenceModality(hay),
    scopeTags: evidenceScopeTags(hay),
    evidenceState: reconcileEvidenceState({
      label: input.title ?? input.id,
      explicitState: typeof input.evidenceState === "string" ? input.evidenceState : null,
      baseStatus: typeof input.evidenceState === "string" ? input.evidenceState : undefined,
    }),
    aliasFamilyKey: evidenceAliasKeyForLabel(input.title ?? input.haystack) || null,
    exhibitLabel: input.exhibitLabel?.trim() || null,
    sourcePage: pageIdentityKnown ? (input.sourcePage ?? null) : null,
    compiledPage: pageIdentityKnown ? (input.compiledPage ?? null) : null,
    pageIdentityKnown,
  };
}

function extractDocumentDate(hay: string): string | null {
  const iso = hay.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1]!;
  const uk = hay.match(
    /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})\b/i,
  );
  if (uk) return uk[1]!;
  const dated = hay.match(/\bdated\s+(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})\b/i);
  return dated?.[1] ?? null;
}

function extractVersionNumber(hay: string): number | null {
  const m = hay.match(/\b(?:version|ver|v)\s*(\d+)\b/i) ?? hay.match(/\bamended\s*\(v?(\d+)\)/i);
  if (!m?.[1]) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Why one instrument outranks another. Upload order is the last documentary tier,
 * and the id tie-break exists only so equal/absent timestamps stay deterministic.
 */
export type OperativePrecedenceBasis =
  | "explicit_replacement"
  | "operative_status"
  | "document_date"
  | "document_version"
  | "upload_order"
  | "stable_tie_break"
  | "single_candidate"
  | "none";

/** What documentary fact, if any, supports treating `other` as superseded by `winner`. */
export type SupersessionSupport =
  | "explicit_replacement"
  | "declared_role"
  | "document_version"
  | "document_date"
  | "unsupported";

export type OperativePrecedenceResult = {
  operative: DocumentRelationshipNode | null;
  superseded: DocumentRelationshipNode[];
  nodes: DocumentRelationshipNode[];
  /** Highest tier that actually decided the operative selection. */
  basis: OperativePrecedenceBasis;
  /** Same-family documents that were NOT superseded because nothing supported it. */
  unsupportedSupersessionCandidates: Array<{ id: string; reason: string }>;
  /** Support recorded for each node marked superseded. */
  supersessionSupport: Array<{ id: string; support: SupersessionSupport }>;
};

/** +1 when a explicitly replaces b, -1 when b replaces a, 0 when neither. */
export function explicitReplacementDirection(
  a: DocumentRelationshipNode,
  b: DocumentRelationshipNode,
): number {
  const aReplacesB = a.replacesDocumentId === b.id || a.earlierDocumentId === b.id;
  const bReplacesA = b.replacesDocumentId === a.id || b.earlierDocumentId === a.id;
  if (aReplacesB && !bReplacesA) return 1;
  if (bReplacesA && !aReplacesB) return -1;
  return 0;
}

/**
 * Documentary support for supersession. Upload order and retrieval order are
 * never support — a later-uploaded duplicate does not displace an earlier document.
 */
export function supersessionSupportFor(
  winner: DocumentRelationshipNode,
  other: DocumentRelationshipNode,
): SupersessionSupport {
  if (explicitReplacementDirection(winner, other) > 0) return "explicit_replacement";
  if (other.role === "superseded") return "declared_role";
  if (!isSameInstrumentFamily(winner, other)) return "unsupported";
  if (
    winner.versionNumber != null &&
    other.versionNumber != null &&
    winner.versionNumber > other.versionNumber
  ) {
    return "document_version";
  }
  const dw = sortableDate(winner.documentDate);
  const do_ = sortableDate(other.documentDate);
  if (dw != null && do_ != null && dw > do_) return "document_date";
  return "unsupported";
}

/** Which tier separates two candidates — used for precedence receipts. */
export function operativePrecedenceBasis(
  a: DocumentRelationshipNode,
  b: DocumentRelationshipNode,
): OperativePrecedenceBasis {
  if (explicitReplacementDirection(a, b) !== 0) return "explicit_replacement";
  if (rolePrecedenceScore(a) !== rolePrecedenceScore(b)) return "operative_status";
  const da = sortableDate(a.documentDate);
  const db = sortableDate(b.documentDate);
  if (da != null && db != null && da !== db) return "document_date";
  if ((da == null) !== (db == null)) return "document_date";
  if ((a.versionNumber ?? -1) !== (b.versionNumber ?? -1)) return "document_version";
  if (a.uploadOrder !== b.uploadOrder) return "upload_order";
  return "stable_tie_break";
}

function rolePrecedenceScore(n: DocumentRelationshipNode): number {
  return n.role === "amended" ? 3 : n.role === "operative" ? 2 : n.role === "unknown" ? 1 : 0;
}

/**
 * Deterministic operative precedence.
 * Explicit replacement linkage first, then reliable operative status, then
 * document date/version, then upload order, then a stable id tie-break.
 * Never selects whichever node appears first in the array.
 */
export function resolveOperativeDocumentPrecedence(
  nodes: DocumentRelationshipNode[],
): OperativePrecedenceResult {
  if (!nodes.length) {
    return {
      operative: null,
      superseded: [],
      nodes: [],
      basis: "none",
      unsupportedSupersessionCandidates: [],
      supersessionSupport: [],
    };
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const instrumentLike = nodes.filter((n) =>
    /indictment|charge|information|charge_sheet|charge sheet/i.test(
      `${n.documentType ?? ""} ${n.title ?? ""}`,
    ) || n.role === "amended" || n.role === "operative" || n.role === "superseded",
  );
  const pool = instrumentLike.length ? instrumentLike : nodes;

  // Explicit replacement: if A.replacesDocumentId = B, A outranks B.
  const replacedIds = new Set(
    pool.map((n) => n.replacesDocumentId).filter((id): id is string => Boolean(id)),
  );
  for (const n of pool) {
    if (n.earlierDocumentId) replacedIds.add(n.earlierDocumentId);
  }

  // Also parse "replaces" / "supersedes" language pointing at another title.
  for (const n of pool) {
    for (const other of pool) {
      if (other.id === n.id) continue;
      const hay = `${n.title ?? ""}`;
      if (
        other.title &&
        new RegExp(`\\b(?:replaces|supersedes|amends)\\b[^.]{0,40}${escapeRegExp(other.title)}`, "i").test(
          `${n.title ?? ""} ${n.documentType ?? ""}`,
        )
      ) {
        replacedIds.add(other.id);
        if (!n.replacesDocumentId) {
          byId.set(n.id, { ...n, replacesDocumentId: other.id, earlierDocumentId: other.id });
        }
      }
      void hay;
    }
  }

  // An explicitly replaced document can never be the operative one, whatever its own date.
  const candidates = pool.map((n) => byId.get(n.id)!).filter((n) => !replacedIds.has(n.id));
  const pooledCandidates = candidates.length ? candidates : pool.map((n) => byId.get(n.id)!);

  const ranked = [...pooledCandidates].sort((a, b) => compareOperativePrecedence(b, a));
  // Highest rank wins — never array order.
  const winner = ranked[0] ?? null;

  // Basis is measured against the strongest documentary rival in the full pool
  // (including explicitly replaced instruments), not only among remaining candidates.
  const rivals = pool
    .map((n) => byId.get(n.id)!)
    .filter((n) => n.id !== winner?.id)
    .sort((a, b) => compareOperativePrecedence(b, a));
  const strongestRival = rivals[0] ?? null;
  const basis: OperativePrecedenceBasis = !winner
    ? "none"
    : !strongestRival
      ? "single_candidate"
      : operativePrecedenceBasis(winner, strongestRival);

  const unsupportedSupersessionCandidates: Array<{ id: string; reason: string }> = [];
  const supersessionSupport: Array<{ id: string; support: SupersessionSupport }> = [];

  const resolved: DocumentRelationshipNode[] = nodes.map((n) => {
    const current = byId.get(n.id) ?? n;
    if (!winner) return current;
    if (current.id === winner.id) {
      return {
        ...current,
        role: current.role === "amended" || current.role === "operative" ? current.role : "operative",
        earlierDocumentId: current.replacesDocumentId ?? current.earlierDocumentId,
      };
    }
    const support = replacedIds.has(current.id)
      ? "explicit_replacement"
      : supersessionSupportFor(winner, current);
    if (support === "unsupported") {
      if (isSameInstrumentFamily(winner, current)) {
        unsupportedSupersessionCandidates.push({
          id: current.id,
          reason:
            "Same instrument family as the operative document, but no explicit replacement, declared role, version or document date supports supersession — upload order alone is not documentary truth",
        });
      }
      return current;
    }
    supersessionSupport.push({ id: current.id, support });
    return { ...current, role: "superseded" as const };
  });

  const operative = resolved.find((n) => n.id === winner?.id) ?? null;
  const superseded = resolved.filter((n) => n.role === "superseded");
  return {
    operative,
    superseded,
    nodes: resolved,
    basis,
    unsupportedSupersessionCandidates,
    supersessionSupport,
  };
}

function isSameInstrumentFamily(a: DocumentRelationshipNode, b: DocumentRelationshipNode): boolean {
  const family = (n: DocumentRelationshipNode) =>
    normalizeFieldValue(`${n.documentType ?? ""} ${n.title ?? ""}`)
      .replace(/\b(amended|original|operative|superseded|draft)\b/g, "")
      .trim();
  const fa = family(a);
  const fb = family(b);
  if (!fa || !fb) return false;
  return fa === fb || fa.includes("indictment") && fb.includes("indictment");
}

/**
 * Higher score = more operative. Tiers, in order:
 *   1 explicit replacement/amendment linkage
 *   2 reliable operative status (declared role)
 *   3 document date, then document version, where safely comparable
 *   4 chronological upload order — fallback only
 *   5 stable id tie-break, so equal or absent timestamps stay deterministic
 * Array index is NEVER used.
 */
export function compareOperativePrecedence(
  a: DocumentRelationshipNode,
  b: DocumentRelationshipNode,
): number {
  const explicit = explicitReplacementDirection(a, b);
  if (explicit !== 0) return explicit;

  const rs = rolePrecedenceScore(a) - rolePrecedenceScore(b);
  if (rs !== 0) return rs;

  const da = sortableDate(a.documentDate);
  const db = sortableDate(b.documentDate);
  if (da != null && db != null && da !== db) return da - db;
  if (da != null && db == null) return 1;
  if (db != null && da == null) return -1;

  const va = a.versionNumber ?? -1;
  const vb = b.versionNumber ?? -1;
  if (va !== vb) return va - vb;

  if (a.uploadOrder !== b.uploadOrder) return a.uploadOrder - b.uploadOrder;

  // Deterministic last resort: identical documentary signals must not depend on
  // array position, retrieval order, or sort stability.
  return String(a.id).localeCompare(String(b.id));
}

/** Parse a document date defensively — unparseable values must not rank. */
function sortableDate(raw: string | null): number | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t || /^(?:null|undefined|nan|invalid date)$/i.test(t)) return null;
  const iso = Date.parse(t);
  if (Number.isFinite(iso)) return iso;
  const uk = raw.match(
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i,
  );
  if (uk) {
    const months: Record<string, number> = {
      january: 0,
      february: 1,
      march: 2,
      april: 3,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11,
    };
    const d = new Date(Date.UTC(parseInt(uk[3]!, 10), months[uk[2]!.toLowerCase()] ?? 0, parseInt(uk[1]!, 10)));
    return d.getTime();
  }
  return null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Operative/amended node keeps earlier values alongside — never overwrite.
 */
export function preserveEarlierAlongsideOperative(
  operative: DocumentRelationshipNode,
  earlier: DocumentRelationshipNode,
): DocumentRelationshipNode {
  return {
    ...operative,
    earlierDocumentId: earlier.id,
    replacesDocumentId: operative.replacesDocumentId ?? earlier.id,
    changedFields: [
      ...earlier.changedFields,
      ...operative.changedFields,
      ...(earlier.title &&
      operative.title &&
      normalizeFieldValue(earlier.title) !== normalizeFieldValue(operative.title)
        ? [{ field: "document_title", earlierValue: earlier.title, laterValue: operative.title }]
        : []),
    ],
  };
}

export function buildDocumentRelationshipGraph(input: {
  nodes: DocumentRelationshipNode[];
  bundleText?: string | null;
  onFileLabels?: string[];
  exhibitEntries?: Array<{ label: string; description: string }>;
  evidenceRows?: Array<{ label: string; state: SharedEvidenceState }>;
}): DocumentRelationshipGraph {
  const precedence = resolveOperativeDocumentPrecedence(input.nodes);
  return {
    nodes: precedence.nodes,
    referencedAbsentAttachments: input.bundleText
      ? detectReferencedAbsentAttachments(input.bundleText, input.onFileLabels ?? [])
      : [],
    exhibitCollisions: detectExhibitLabelCollisions(input.exhibitEntries ?? []),
    aliasFamilies: expandAliasesWithoutCollapse(input.evidenceRows ?? []),
  };
}
