import {
  buildMetadataScan,
  extractBundleCaseMetadata,
  type ExtractedBundleCaseMetadata,
} from "@/lib/criminal/extract-bundle-case-metadata";
import { buildBundleSizeProfile, type BundleSizeProfile } from "@/lib/bundle/bundle-display-profile";
import { combineCaseDocumentsText, getDocumentBodyText } from "./bundle-document-text";

const HEADER_SCAN = 16_000;
const SNIPPET_MAX = 8000;

export type ParsedBundleHeader = {
  reference: string | null;
  shortTitle: string | null;
  accused: string | null;
  otherParty: string | null;
  primaryEvalHook: string | null;
  stage: string | null;
  messiness: string | null;
  plea: string | null;
};

export function parseBundleHeaderFields(full: string): ParsedBundleHeader | null {
  if (!full || full.trim().length < 20) return null;
  const scan = full.slice(0, HEADER_SCAN);

  const ref = scan.match(/^\s*Reference:\s*(.+)$/im);
  const short = scan.match(/^\s*Short title:\s*(.+)$/im);
  const accused = scan.match(/^\s*Accused:\s*(.+)$/im);
  const witness =
    scan.match(/^\s*Other party\s*\/\s*key witness:\s*(.+)$/im) ?? scan.match(/^\s*Key witness:\s*(.+)$/im);
  const hook = scan.match(/^\s*Primary eval hook:\s*(.+)$/im);
  const stage = scan.match(/^\s*Stage:\s*(.+)$/im);
  const messiness = scan.match(/^\s*Messiness:\s*(.+)$/im);
  const plea = scan.match(/^\s*Plea:\s*(.+)$/im);

  const empty =
    !ref &&
    !short &&
    !accused &&
    !witness &&
    !hook &&
    !stage &&
    !messiness &&
    !plea;
  if (empty) return null;

  return {
    reference: ref?.[1]?.trim() ?? null,
    shortTitle: short?.[1]?.trim() ?? null,
    accused: accused?.[1]?.trim() ?? null,
    otherParty: witness?.[1]?.trim() ?? null,
    primaryEvalHook: hook?.[1]?.trim() ?? null,
    stage: stage?.[1]?.trim() ?? null,
    messiness: messiness?.[1]?.trim() ?? null,
    plea: plea?.[1]?.trim() ?? null,
  };
}

function extractBetweenSectionMarkers(full: string, sectionLabel: string): string | null {
  const re = new RegExp(`===\\s*SECTION:\\s*${sectionLabel}\\s*===`, "i");
  const m = full.match(re);
  if (!m || m.index === undefined) return null;
  const start = m.index + m[0].length;
  const rest = full.slice(start);
  const nextIdx = rest.search(/\n===\s*SECTION:/i);
  const body = (nextIdx >= 0 ? rest.slice(0, nextIdx) : rest).trim();
  if (!body) return null;
  if (body.length > SNIPPET_MAX) return `${body.slice(0, SNIPPET_MAX)}\n\n[… truncated …]`;
  return body;
}

export type BundleSnippets = {
  mg5: string | null;
  mg6: string | null;
  mg11: string | null;
  exhibits: string | null;
};

function extractMg5Snippet(full: string): string | null {
  const section = extractBetweenSectionMarkers(full, "MG5");
  if (section) return section;

  const mg5Header = full.match(/\bMG5\b[\s\S]{0,8000}?(?=\n===\s*SECTION:|\nMG11\b|\nwitness statement|$)/i);
  if (mg5Header?.[0]?.trim()) {
    const body = mg5Header[0].trim();
    return body.length > SNIPPET_MAX ? `${body.slice(0, SNIPPET_MAX)}\n\n[… truncated …]` : body;
  }

  const summary = full.match(/MG5 case summary[\s\S]{0,6000}?(?=\nMG11\b|\nwitness statement|\n===\s*SECTION:|$)/i);
  if (summary?.[0]?.trim()) {
    const body = summary[0].trim();
    return body.length > SNIPPET_MAX ? `${body.slice(0, SNIPPET_MAX)}\n\n[… truncated …]` : body;
  }

  return null;
}

function extractMg11Snippet(full: string): string | null {
  const section = extractBetweenSectionMarkers(full, "MG11");
  if (section) return section;

  const mg11Header = full.match(
    /(?:===\s*SECTION:\s*MG11[^\n]*===|MG11\s*[–\-]\s*[^\n]+|MG11\s+witness statement[^\n]*)([\s\S]{0,8000}?)(?=\n===\s*SECTION:|\nMG11\s*[–\-]|\nMG5\b|$)/i,
  );
  if (mg11Header?.[0]?.trim()) {
    const body = mg11Header[0].trim();
    return body.length > SNIPPET_MAX ? `${body.slice(0, SNIPPET_MAX)}\n\n[… truncated …]` : body;
  }

  return null;
}

export function extractBundleSnippets(full: string): BundleSnippets {
  const mg5 = extractMg5Snippet(full);
  const mg6 = extractBetweenSectionMarkers(full, "MG6") ?? null;
  const mg11 = extractMg11Snippet(full);
  let exhibits =
    extractBetweenSectionMarkers(full, "EXHIBITS") ??
    extractBetweenSectionMarkers(full, "EXHIBIT") ??
    null;
  if (!exhibits && /\bEX-[A-Z0-9]/i.test(full)) {
    const exBlock = full.match(/EXHIBIT LIST[^\n]*\n[\s\S]{0,6000}/i);
    if (exBlock) exhibits = exBlock[0].trim().slice(0, SNIPPET_MAX);
  }
  return { mg5, mg6, mg11, exhibits };
}

export type BundleHealth = {
  status: "empty" | "partial" | "ok";
  duplicateDocuments: number;
  headerDetected: boolean;
  mg5Detected: boolean;
  mg6Detected: boolean;
  exhibitLineCount: number;
};

function countExhibitLines(text: string): number {
  const matches = text.match(/\bEX-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+\b/gi);
  return matches?.length ?? 0;
}

export function computeBundleHealth(
  documents: Array<{ raw_text?: string | null; extracted_text?: string | null; extracted_json?: unknown }>,
  combinedText: string,
  header: ParsedBundleHeader | null,
): BundleHealth {
  const duplicateDocuments = Math.max(0, documents.length - 1);
  const len = combinedText.trim().length;
  const mg5Detected = /===\s*SECTION:\s*MG5\b/i.test(combinedText) || /\bMG5\s*—\s*CASE SUMMARY/i.test(combinedText);
  const mg6Detected = /===\s*SECTION:\s*MG6/i.test(combinedText) || /MG6\s*\(a\)\s*—\s*SCHEDULE/i.test(combinedText);
  const exhibitLineCount = countExhibitLines(combinedText);

  if (len < 50) {
    return {
      status: "empty",
      duplicateDocuments,
      headerDetected: !!header?.reference || !!header?.accused,
      mg5Detected,
      mg6Detected,
      exhibitLineCount,
    };
  }

  const headerDetected = !!header && (!!header.reference || !!header.accused);
  const ok =
    headerDetected &&
    len >= 400 &&
    (mg5Detected || mg6Detected || exhibitLineCount > 0);

  return {
    status: ok ? "ok" : "partial",
    duplicateDocuments,
    headerDetected,
    mg5Detected,
    mg6Detected,
    exhibitLineCount,
  };
}

export type DocumentRowMeta = {
  id: string;
  name: string | null;
  updatedAt: string | null;
  lenExtracted: number;
  lenRaw: number;
  lenBody: number;
};

export function buildBundleSourcePayload(docs: Array<Record<string, unknown>>): {
  combinedText: string;
  documentRows: DocumentRowMeta[];
  health: BundleHealth;
  header: ParsedBundleHeader | null;
  snippets: BundleSnippets;
  caseMetadata: ExtractedBundleCaseMetadata;
  sizeProfile: BundleSizeProfile;
  frontMatterScan: string;
} {
  const typed = docs as Array<{
    id: string;
    name?: string | null;
    updated_at?: string | null;
    raw_text?: string | null;
    extracted_text?: string | null;
    extracted_json?: unknown;
  }>;

  const combinedText = combineCaseDocumentsText(typed);
  const header = parseBundleHeaderFields(combinedText);
  const caseMetadata = extractBundleCaseMetadata(combinedText, header);
  const snippets = extractBundleSnippets(combinedText);
  const health = computeBundleHealth(typed, combinedText, header);

  const documentRows: DocumentRowMeta[] = typed.map((d) => {
    const raw = typeof d.raw_text === "string" ? d.raw_text.length : 0;
    const ext = typeof d.extracted_text === "string" ? d.extracted_text.length : 0;
    const body = getDocumentBodyText(d).length;
    return {
      id: d.id,
      name: typeof d.name === "string" && d.name.trim() ? d.name.trim() : null,
      updatedAt: d.updated_at ?? null,
      lenExtracted: ext,
      lenRaw: raw,
      lenBody: body,
    };
  });

  const sizeProfile = buildBundleSizeProfile(
    typed.length,
    combinedText.length,
    typed.map((d) => ({ name: d.name, extracted_json: d.extracted_json })),
    documentRows,
  );

  const frontMatterScan = buildMetadataScan(combinedText);

  return {
    combinedText,
    documentRows,
    health,
    header,
    snippets,
    caseMetadata,
    sizeProfile,
    frontMatterScan,
  };
}
