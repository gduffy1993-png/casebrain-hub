/** Combine bundle-source API fields into text suitable for proof-map generation. */

export type BundleTextInput = {
  frontMatterScan?: string | null;
  snippets?: {
    mg5?: string | null;
    mg6?: string | null;
    exhibits?: string | null;
  };
};

export function assembleBundleTextForReasoning(input: BundleTextInput): string {
  const parts: string[] = [];
  const front = input.frontMatterScan?.trim();
  if (front) parts.push(front);

  const pushSection = (label: string, body: string | null | undefined) => {
    const t = body?.trim();
    if (t) parts.push(`\n=== SECTION: ${label} ===\n${t}`);
  };

  pushSection("MG5", input.snippets?.mg5);
  pushSection("MG6", input.snippets?.mg6);
  pushSection("EXHIBITS", input.snippets?.exhibits);

  return parts.join("\n\n").trim();
}

/** Minimum text before attempting proof-map spine (front matter or snippets). */
export const REASONING_V2_MIN_BUNDLE_CHARS = 120;
