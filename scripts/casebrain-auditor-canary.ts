#!/usr/bin/env npx tsx
/** Fast canary playback — see casebrain-auditor-playback.ts --canary */
import { spawnSync } from "node:child_process";
import path from "node:path";

const script = path.join(process.cwd(), "scripts", "casebrain-auditor-playback.ts");
const args = ["tsx", script, "--corpus", "real", "--canary", ...process.argv.slice(2)];
const r = spawnSync("npx", args, { stdio: "inherit", shell: true, env: process.env });
process.exit(r.status ?? 1);
