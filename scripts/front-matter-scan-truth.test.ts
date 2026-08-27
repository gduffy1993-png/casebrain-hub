/**
 * The scan the rest of the app works from has to cover a Crown Court bundle, not just its cover.
 *
 * Hale's papers are 167,000 characters. At 80,000 the app never reached the later schedule rows.
 * This fails if that cap quietly returns.
 */
import assert from "node:assert/strict";

import { buildMetadataScan } from "../lib/criminal/extract-bundle-case-metadata";

const haleSized = `${"schedule row CCTV stills outstanding EX-MUR-009.\n".repeat(6_000)}`;
assert.ok(haleSized.length > 120_000, "fixture must be larger than the old 80k cap");

const scan = buildMetadataScan(haleSized);
assert.ok(
  scan.length > 120_000,
  `front-matter scan was ${scan.length} chars — a 167k bundle would still be truncated`,
);

console.log(`front-matter-scan-truth: PASS (${haleSized.length} in, ${scan.length} out)`);
