import type { PdfPageRecord } from "../line-source-proof/pdf-bundle-pipeline";

export type PdfSectionRef = {
  name: string;
  part?: number;
  parts?: number;
};

export type PdfPageLayoutSpec = {
  pageNumber: number;
  label: string;
  sections: PdfSectionRef[];
  includeBundleHeader?: boolean;
};

function parseBundleSections(bundleText: string): Array<{ name: string; body: string }> {
  const sections: Array<{ name: string; body: string }> = [];
  const re = /^=== SECTION:\s*([A-Z0-9_]+)\s*===\s*$/gm;
  const matches = [...bundleText.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]!;
    const name = m[1] ?? "UNKNOWN";
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1]!.index! : bundleText.length;
    sections.push({ name, body: bundleText.slice(start, end).trim() });
  }
  return sections;
}

function sectionBody(bundleText: string, name: string): string {
  return parseBundleSections(bundleText).find((s) => s.name === name)?.body ?? "";
}

function sliceSectionBody(body: string, part: number, parts: number): string {
  const lines = body.split(/\r?\n/);
  const chunkSize = Math.max(1, Math.ceil(lines.length / parts));
  const start = part * chunkSize;
  return lines.slice(start, start + chunkSize).join("\n").trim();
}

/** Build PDF page records from explicit per-case layout (index-aligned prosecution bundles). */
export function buildPdfPagesFromLayout(bundleText: string, layout: PdfPageLayoutSpec[]): PdfPageRecord[] {
  const header = bundleText.split(/^=== SECTION:/m)[0]?.trim() ?? "";

  return layout.map((spec) => {
    const parts: string[] = [];
    if (spec.includeBundleHeader && header) parts.push(header);

    for (const sec of spec.sections) {
      const body = sectionBody(bundleText, sec.name);
      const splitParts = sec.parts ?? 1;
      const splitPart = sec.part ?? 0;
      const sectionText =
        splitParts > 1 ? sliceSectionBody(body, splitPart, splitParts) : body;
      parts.push(`=== SECTION: ${sec.name} ===\n\n${sectionText}`);
    }

    return {
      pageNumber: spec.pageNumber,
      label: spec.label,
      text: parts.join("\n\n").trim(),
    };
  });
}
