/**
 * Pack import preview: sequential slots avoid filename collisions (Pack Y 0108→8).
 */
import assert from "node:assert/strict";
import { buildPackImportPreview } from "../lib/eval-pack-import-ui";

function fakeFile(name: string): File {
  return { name, size: 1, lastModified: 0 } as File;
}

function testSequentialPackYSlots() {
  const files = [
    "CB-Y-2026-0101.pdf",
    "CB-Y-2026-0108.pdf",
    "CB-Y-2026-0118.pdf",
    "CB-Y-2026-0128.pdf",
  ].map(fakeFile);

  const { rows } = buildPackImportPreview({
    packId: "Y",
    files,
    manifest: new Map(),
    existingPackCaseNos: new Set(),
    preferSequentialSlots: true,
  });

  assert.equal(rows.length, 4);
  assert.deepEqual(
    rows.map((r) => r.evalCaseNo),
    [1, 2, 3, 4]
  );
  assert.ok(rows.every((r) => r.packId === "Y"));
}

function testInferModeStillCollidesWithoutSequential() {
  const files = ["CB-Y-2026-0108.pdf", "CB-Y-2026-0208.pdf"].map(fakeFile);
  const { rows, warnings } = buildPackImportPreview({
    packId: "Y",
    files,
    manifest: new Map(),
    existingPackCaseNos: new Set(),
    preferSequentialSlots: false,
  });
  const slots = rows.map((r) => r.evalCaseNo);
  assert.ok(slots.includes(8), "inference maps 0108 to 8");
  assert.ok(warnings.some((w) => /collision|Duplicate inferred|Adjusted/i.test(w)));
}

testSequentialPackYSlots();
testInferModeStillCollidesWithoutSequential();
console.log("eval-pack-import-preview.test.ts: ok");
