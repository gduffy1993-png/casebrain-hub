/**
 * Invent-mute board: count invented CCTV continuity/master/ID chase surfaces
 * across selected audit cases after shared-root gate.
 *
 * Run: npx tsx artifacts/casebrain-qa/assurance/invent-mute-v1/run-invent-mute-board.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "true";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../../");

async function main() {
  const { buildDisclosureChaseBrief } = await import(
    pathToFileURL(path.join(repoRoot, "components/criminal/disclosure-chase/buildDisclosureChaseBrief.ts")).href
  );
  const {
    isCctvContinuityEstablished,
    isCctvMasterEstablished,
    isIdentificationProcedureEstablished,
  } = await import(pathToFileURL(path.join(repoRoot, "lib/criminal/chase-source-gate.ts")).href);

  const casesRoot = path.join(repoRoot, "artifacts/evidence-state-audit-local/cases");
  const selectedPath = path.join(
    repoRoot,
    "artifacts/casebrain-qa/assurance/fifty-case-identity-board-v1/selected-50.json",
  );
  const selected = JSON.parse(fs.readFileSync(selectedPath, "utf8"));
  const ids = Array.isArray(selected) ? selected : selected.caseIds ?? selected.ids ?? [];

  const inventRe =
    /CCTV continuity|CCTV master|full window|ID procedure|VIPER|identification procedure/i;
  const rows = [];
  for (const caseId of ids) {
    const dir = path.join(casesRoot, caseId);
    const bundlePath = [
      path.join(dir, "bundle-text.md"),
      path.join(dir, "bundleText.md"),
      path.join(dir, "bundle.txt"),
    ].find((p) => fs.existsSync(p));
    if (!bundlePath) {
      rows.push({ caseId, skipped: true, reason: "no-bundle" });
      continue;
    }
    const bundle = fs.readFileSync(bundlePath, "utf8");
    const brief = buildDisclosureChaseBrief({
      caseId,
      caseTitle: caseId,
      clientLabel: caseId,
      allegation: "Criminal",
      stage: "PTPH",
      hearingStatus: "Listed",
      hearingDateIso: null,
      bundleHealth: "Partial",
      positionStatus: "Provisional",
      battleboard: null,
      bundleText: bundle,
    });
    const inventLabels = brief.items
      .filter(
        (i) =>
          inventRe.test(i.label) ||
          i.familyId === "cctv_continuity" ||
          i.familyId === "cctv_master",
      )
      .map((i) => i.label);
    const pdfHasContinuity = isCctvContinuityEstablished(bundle);
    const pdfHasMaster = isCctvMasterEstablished(bundle);
    const pdfHasId = isIdentificationProcedureEstablished(bundle);
    const bad = inventLabels.filter((l) => {
      if (/continuity/i.test(l) && !pdfHasContinuity) return true;
      if (/master|full window/i.test(l) && !pdfHasMaster) return true;
      if (/ID procedure|VIPER|identification procedure/i.test(l) && !pdfHasId) return true;
      return false;
    });
    const courtBlob = [brief.safeCourtLine, ...brief.items.map((i) => i.courtLine ?? "")].join(
      "\n",
    );
    const courtInvent =
      /identification(?:\s*,\s*participation)?(?:\s+and\s+attribution)?\s+remain\s+conditional/i.test(
        courtBlob,
      ) && !pdfHasId;
    rows.push({
      caseId,
      inventLabels,
      inventedWithoutSource: bad,
      courtIdentificationInvent: courtInvent,
      pdfHasContinuity,
      pdfHasMaster,
      pdfHasId,
    });
  }

  const inventCases = rows.filter(
    (r) => !r.skipped && (r.inventedWithoutSource?.length > 0 || r.courtIdentificationInvent),
  );
  const summary = {
    generatedAt: new Date().toISOString(),
    compared: rows.filter((r) => !r.skipped).length,
    skipped: rows.filter((r) => r.skipped).length,
    inventMuteFailCases: inventCases.length,
    inventMuteFailHits: inventCases.reduce(
      (s, r) => s + (r.inventedWithoutSource?.length ?? 0) + (r.courtIdentificationInvent ? 1 : 0),
      0,
    ),
    failCaseIds: inventCases.map((r) => r.caseId),
  };
  fs.mkdirSync(__dirname, { recursive: true });
  fs.writeFileSync(path.join(__dirname, "summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(__dirname, "case-rows.json"), JSON.stringify(rows, null, 2));
  const md = [
    "# Invent-mute board (50 cases)",
    "",
    `- Compared: ${summary.compared}`,
    `- Skipped (no bundle): ${summary.skipped}`,
    `- Invent-without-source fail cases: **${summary.inventMuteFailCases}**`,
    `- Invent hits: **${summary.inventMuteFailHits}**`,
    "",
    "## Failures",
    "",
    ...(inventCases.length
      ? inventCases.map((r) => {
          const bits = [...(r.inventedWithoutSource ?? [])];
          if (r.courtIdentificationInvent) bits.push("court Identification lead invent");
          return `- \`${r.caseId}\`: ${bits.join("; ")}`;
        })
      : ["_None — invent mute holding on selected set._"]),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(__dirname, "BOARD.md"), md);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
