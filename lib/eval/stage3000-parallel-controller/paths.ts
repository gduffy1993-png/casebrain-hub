/**
 * Source / truth / output / control separation + CaseBrain forbidden plane.
 */

import fs from "node:fs";
import path from "node:path";

import { WORKSPACE_ROLES, type WorkspaceRole } from "./constants";
import type { WorkspaceLayout } from "./types";

export function buildWorkspaceLayout(root: string): WorkspaceLayout {
  const abs = path.resolve(root);
  const roles = {
    source: path.join(abs, "source"),
    truth: path.join(abs, "truth"),
    output: path.join(abs, "output"),
    control: path.join(abs, "control"),
    casebrain_forbidden: path.join(abs, "casebrain_forbidden"),
  } satisfies Record<WorkspaceRole, string>;
  return { root: abs, roles };
}

export function ensureWorkspaceLayout(layout: WorkspaceLayout): void {
  for (const role of WORKSPACE_ROLES) {
    fs.mkdirSync(layout.roles[role], { recursive: true });
  }
  // Marker files document policy for operators and contracts.
  writeIfAbsent(
    path.join(layout.roles.source, "README.txt"),
    "SOURCE plane — generator inputs and pins only.\n",
  );
  writeIfAbsent(
    path.join(layout.roles.truth, "README.txt"),
    "TRUTH plane — sealed from generators until candidate freeze.\n",
  );
  writeIfAbsent(
    path.join(layout.roles.output, "README.txt"),
    "OUTPUT plane — shard candidates and receipts material.\n",
  );
  writeIfAbsent(
    path.join(layout.roles.control, "README.txt"),
    "CONTROL plane — manifests, checkpoints, reconciliation.\n",
  );
  writeIfAbsent(
    path.join(layout.roles.casebrain_forbidden, "README.txt"),
    "CASEBRAIN FORBIDDEN plane — generators must never read this path.\n",
  );
}

function writeIfAbsent(filePath: string, contents: string): void {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, contents, "utf8");
  }
}

/**
 * Paths a generator is allowed to see.
 * Explicitly excludes truth and CaseBrain outputs.
 */
export function generatorVisibleRoots(layout: WorkspaceLayout): {
  sourceRoot: string;
  forbiddenRoots: string[];
} {
  return {
    sourceRoot: layout.roles.source,
    forbiddenRoots: [
      layout.roles.truth,
      layout.roles.casebrain_forbidden,
      // Control is controller-owned; generators do not need it.
      layout.roles.control,
    ],
  };
}

export function assertPathNotUnderForbidden(
  candidatePath: string,
  forbiddenRoots: string[],
): void {
  const resolved = path.resolve(candidatePath);
  for (const root of forbiddenRoots) {
    const absRoot = path.resolve(root);
    const rel = path.relative(absRoot, resolved);
    if (rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))) {
      throw new Error(
        `path ${resolved} is under forbidden root ${absRoot}`,
      );
    }
  }
}
