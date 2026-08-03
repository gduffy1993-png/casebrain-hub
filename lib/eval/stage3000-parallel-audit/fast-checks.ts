/**
 * Fast deterministic checks — always run before handler invocation.
 */

import fs from "node:fs";

import { sha256File } from "./hashes";
import { resolveCasePath } from "./shard-manifest";
import type { FastCheckResult, ShardCaseRow } from "./types";

function check(
  checkId: string,
  caseId: string,
  ok: boolean,
  detail: string,
  evidenceRefs: string[],
): FastCheckResult {
  return { checkId, caseId, ok, deterministic: true, detail, evidenceRefs };
}

/**
 * Cheap, deterministic pre-checks for one shard case.
 * Failures block handler invocation for that case.
 */
export function runFastDeterministicChecks(
  repoRoot: string,
  row: ShardCaseRow,
): FastCheckResult[] {
  const results: FastCheckResult[] = [];

  const packetAbs = resolveCasePath(repoRoot, row.packetRelativePath);
  results.push(
    check(
      "packet_exists",
      row.caseId,
      Boolean(packetAbs && fs.existsSync(packetAbs)),
      packetAbs && fs.existsSync(packetAbs)
        ? "packet present"
        : `packet missing: ${row.packetRelativePath}`,
      [row.packetRelativePath],
    ),
  );

  if (packetAbs && fs.existsSync(packetAbs)) {
    let parseOk = false;
    let parseDetail = "packet JSON parse failed";
    try {
      JSON.parse(fs.readFileSync(packetAbs, "utf8"));
      parseOk = true;
      parseDetail = "packet JSON parseable";
    } catch (e) {
      parseDetail = `packet JSON parse failed: ${e instanceof Error ? e.message : String(e)}`;
    }
    results.push(
      check("packet_json_parse", row.caseId, parseOk, parseDetail, [row.packetRelativePath]),
    );
  }

  if (row.outputRelativePath && row.outputSha256) {
    const outAbs = resolveCasePath(repoRoot, row.outputRelativePath);
    const exists = Boolean(outAbs && fs.existsSync(outAbs));
    results.push(
      check(
        "output_exists",
        row.caseId,
        exists,
        exists ? "output present" : `output missing: ${row.outputRelativePath}`,
        [row.outputRelativePath],
      ),
    );
    if (exists && outAbs) {
      const actual = sha256File(outAbs);
      results.push(
        check(
          "output_hash_match",
          row.caseId,
          actual === row.outputSha256,
          actual === row.outputSha256
            ? "output hash matches manifest"
            : "output hash mismatch vs manifest",
          [row.outputRelativePath],
        ),
      );
    }
  } else {
    results.push(
      check(
        "output_declared",
        row.caseId,
        true,
        "output not declared — handlers may record not_exercised",
        [],
      ),
    );
  }

  // Surface map completeness is structural (already validated at manifest load);
  // re-assert every surface key is present as a deterministic check receipt.
  const surfaceKeys = Object.keys(row.surfaces);
  results.push(
    check(
      "surface_map_complete",
      row.caseId,
      surfaceKeys.length === 7,
      `surface keys=${surfaceKeys.length}`,
      surfaceKeys,
    ),
  );

  return results;
}

export function fastChecksPassed(results: FastCheckResult[]): boolean {
  return results.every((r) => r.ok);
}
