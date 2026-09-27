/**
 * Refresh casebrain-output.json for the selected 50 identity-board cases
 * using current buildCasebrainAuditSnapshot (does not touch product DB).
 */
import fs from "fs";
import path from "path";
import { buildCasebrainAuditSnapshot } from "../lib/eval/evidence-state-audit/build-audit-snapshot";
import type { EvidenceStateTruthKey } from "../lib/eval/evidence-state-audit/types";

const ROOT = path.resolve("artifacts/evidence-state-audit-local/cases");
const SELECTED = path.resolve(
  "artifacts/casebrain-qa/assurance/fifty-case-identity-board-v1/selected-50.json",
);

function writeRetry(filePath: string, contents: string, attempts = 6): void {
  let last: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      fs.writeFileSync(filePath, contents);
      return;
    } catch (e) {
      last = e;
      const tmp = `${filePath}.tmp-${process.pid}-${i}`;
      try {
        fs.writeFileSync(tmp, contents);
        fs.renameSync(tmp, filePath);
        return;
      } catch (e2) {
        last = e2;
        const wait = 120 * (i + 1);
        const end = Date.now() + wait;
        while (Date.now() < end) {
          /* spin */
        }
      }
    }
  }
  throw last;
}

const ids: string[] = JSON.parse(fs.readFileSync(SELECTED, "utf8"));
let ok = 0;
let skip = 0;
let fail = 0;

for (const caseId of ids) {
  const dir = path.join(ROOT, caseId);
  const bundlePath = path.join(dir, "bundle-text.md");
  if (!fs.existsSync(bundlePath)) {
    skip++;
    console.log("skip no bundle", caseId);
    continue;
  }
  try {
    const bundleText = fs.readFileSync(bundlePath, "utf8");
    const truth = fs.existsSync(path.join(dir, "truth-key.json"))
      ? (JSON.parse(fs.readFileSync(path.join(dir, "truth-key.json"), "utf8")) as EvidenceStateTruthKey & {
          fakeDefendant?: string;
          offenceWording?: string;
          missingEvidence?: string[];
          referredOnlyEvidence?: string[];
          expectedChaseItems?: string[];
          title?: string;
        })
      : null;

    const clientLabel =
      truth?.fakeDefendant ||
      (typeof truth?.title === "string"
        ? truth.title.replace(/^.*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+).*$/, "$1")
        : null) ||
      caseId;
    const allegation = truth?.offenceWording || "Criminal offence";
    const missingMaterial = [
      ...(truth?.missingEvidence ?? []),
      ...(truth?.referredOnlyEvidence ?? []),
      ...(truth?.expectedChaseItems ?? []),
    ].filter((v, i, a) => a.indexOf(v) === i);

    const output = buildCasebrainAuditSnapshot({
      caseId,
      bundleText,
      clientLabel: String(clientLabel),
      allegation,
      caseTitle: truth?.title || `R v ${clientLabel}`,
      offenceLabel: allegation,
      missingMaterial,
      truthKey: truth ?? undefined,
    });

    writeRetry(path.join(dir, "casebrain-output.json"), `${JSON.stringify(output, null, 2)}\n`);
    console.log(
      "refreshed",
      caseId,
      "court=",
      output.caseIdentity?.court || "—",
      "hearing=",
      output.caseIdentity?.hearingDateIso || output.caseIdentity?.hearingDateRaw || "—",
    );
    ok++;
  } catch (e) {
    fail++;
    console.log("FAIL", caseId, String((e as Error).message || e).slice(0, 160));
  }
}

console.log(JSON.stringify({ ok, skip, fail, total: ids.length }));
