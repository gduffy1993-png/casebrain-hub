import type { StrategyCorpusManifest } from "./strategy-corpus-types";

function fictionalHeader(): string {
  return [
    "FICTIONAL TEST BUNDLE — NOT FOR REAL WORLD USE",
    "Training/Test Document — Synthetic Criminal Bundle Factory v1 (Phase 4e)",
    "",
  ].join("\n");
}

function coverSection(m: StrategyCorpusManifest): string {
  const coDef =
    m.defendantCount > 1
      ? `\n**Co-defendants:** ${m.defendantCount - 1} additional defendant(s) on indictment`
      : "";
  return [
    "=== SECTION: COVER ===",
    "",
    `# Case cover (Fictional)`,
    "",
    `**Defendant:** ${m.defendantName}${coDef}`,
    `**Charge:** ${m.chargeWording}`,
    `**Stage:** ${m.stage}`,
    `**Case ID:** ${m.caseId}`,
    `**Recipe:** ${m.recipeId}`,
    "",
    "**Primary route:** provisional — chase disclosure before fixing hearing position.",
    "",
  ].join("\n");
}

function chargeSection(m: StrategyCorpusManifest): string {
  const corrected = m.failureModeTags.includes("corrected_charge_sheet");
  const lines = [
    "=== SECTION: CHARGE ===",
    "",
    "# Charge sheet (Fictional)",
    "",
    `**Defendant:** ${m.defendantName}`,
    `**Offence:** ${m.chargeWording}`,
  ];
  if (m.countNumber > 1) {
    lines.push(`**Counts:** ${m.countNumber} counts on indictment — verify particulars on file.`);
  }
  if (corrected) {
    lines.push(
      "",
      "**Note:** Corrected charge sheet replaces original — compare date particulars with MG5.",
      "**Original particulars date:** 14 March 2024",
      "**Corrected particulars date:** 15 March 2024",
    );
  }
  lines.push("", "**Court:** Fictional Crown / Magistrates listing", "");
  return lines.join("\n");
}

function mg5Section(m: StrategyCorpusManifest): string {
  if (m.failureModeTags.includes("missing_mg5")) {
    return [
      "=== SECTION: MG5 ===",
      "",
      "# MG5 — NOT SERVED on this export",
      "",
      "MG5 case summary marked outstanding on disclosure schedule.",
      "",
    ].join("\n");
  }

  const lines = [
    "=== SECTION: MG5 ===",
    "",
    "# MG5 — Case summary (Fictional)",
    "",
    `**Defendant:** ${m.defendantName}`,
    `**Offence:** ${m.chargeWording}`,
    "",
    "## Summary",
    "",
    "Prosecution summary on current papers remains provisional. Core identification, attribution, and continuity material may be outstanding.",
    "",
    "## Evidence relied upon (current papers)",
    "",
  ];

  let n = 1;
  for (const doc of m.documentInventory.filter((d) => d.status !== "outstanding").slice(0, 5)) {
    lines.push(`${n}. **${doc.docType}** — ${doc.status} on export`);
    n++;
  }

  lines.push("", "## Disclosure chase (outstanding on export)", "");
  for (const item of m.missingMaterial) {
    lines.push(`- ${item} — outstanding`);
  }

  if (m.failureModeTags.includes("self_defence_pattern")) {
    lines.push(
      "",
      "## Defence note (provisional)",
      "",
      "Defence indicates self-defence / lawful excuse may be raised — complainant moved first; full account awaits instructions.",
    );
  }

  for (const c of m.contradictions) {
    lines.push(
      "",
      `## Contradiction flag: ${c.label}`,
      "",
      `- ${c.sourceA}: partial account on bundle`,
      `- ${c.sourceB}: conflicting timing/wording — unresolved on papers`,
    );
  }

  lines.push("", "## Defendant account", "", "Defendant interviewed under caution — no comment. Solicitor attended.", "");
  return lines.join("\n");
}

function mg6Section(m: StrategyCorpusManifest): string {
  const incomplete = m.failureModeTags.includes("incomplete_mg6");
  const rows = m.missingMaterial.slice(0, 6).map((item) => {
    return `${item.padEnd(44)} Outstanding   Chase before fixing hearing position.`;
  });

  return [
    "=== SECTION: MG6 ===",
    "",
    `# MG6${incomplete ? " — partial schedule" : ""} (Fictional)`,
    "",
    "| Item | Status | Notes |",
    "|------|--------|-------|",
    ...rows.map((r) => `| ${r.replace(/\s+/g, " ")} |`),
    "",
    incomplete ? "**Schedule incomplete** — further items may exist on CPS system." : "",
    "",
  ].join("\n");
}

function disclosureIndex(m: StrategyCorpusManifest): string {
  const noisy = m.failureModeTags.includes("duplicate_noisy_docs");
  const dup = noisy ? "\n\n**Duplicate pages noted** — index may not match pagination." : "";
  return [
    "=== SECTION: INDEX ===",
    "",
    "# Bundle index (Fictional)",
    "",
    ...m.documentInventory.map((d, i) => `${i + 1}. ${d.docType} (${d.status})`),
    dup,
    "",
  ].join("\n");
}

export function renderCorpusBundleText(m: StrategyCorpusManifest): string {
  if (m.materialisationMode === "manifest-only") {
    return [
      fictionalHeader(),
      `# Manifest-only stub — ${m.caseId}`,
      `Seed: ${m.seed} | Recipe: ${m.recipeId}`,
      `Charge: ${m.chargeWording}`,
    ].join("\n");
  }

  return [
    fictionalHeader(),
    coverSection(m),
    chargeSection(m),
    mg5Section(m),
    mg6Section(m),
    disclosureIndex(m),
  ].join("\n");
}

export function corpusCacheTextPath(caseId: string): string {
  return `artifacts/casebrain-auditor/cache/strategy-corpus/text/${caseId}.md`;
}
