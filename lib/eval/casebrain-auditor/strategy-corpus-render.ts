import type { ContradictionSpec, StrategyCorpusManifest } from "./strategy-corpus-types";

function fictionalHeader(): string {
  return [
    "FICTIONAL TEST BUNDLE — NOT FOR REAL WORLD USE",
    "Training/Test Document — Synthetic Criminal Bundle Factory v1 (Phase 4e)",
    "",
  ].join("\n");
}

function contradictionSourceDetail(c: ContradictionSpec, side: "A" | "B", m: StrategyCorpusManifest): string {
  const label = c.label.toLowerCase();
  if (/timing|date|charge particulars/.test(label)) {
    return side === "A"
      ? "Particulars date: 14 March 2024 (charge sheet)"
      : "MG5 narrative: evening of 15 March 2024";
  }
  if (/cad|sequence timing|dispatch/.test(label)) {
    return side === "A"
      ? "CAD partial extract — 00:24 dispatch reference"
      : "Officer MG11 — attendance approximately 00:30";
  }
  if (/cctv|identification/.test(label)) {
    return side === "A"
      ? "CCTV still / partial export — description on bundle"
      : "Witness MG11 — conflicting description / export outstanding";
  }
  if (/weapon|provenance/.test(label)) {
    return side === "A"
      ? "Scene log — item recovered / tagged"
      : "Exhibit schedule — provenance incomplete or conflicting";
  }
  if (/device|handset|subscriber|attribution/.test(label)) {
    return side === "A"
      ? "Handset seizure notes — attribution asserted"
      : "Subscriber / IMEI material — attribution unresolved on papers";
  }
  if (/injury|causation|medical/.test(label)) {
    return side === "A"
      ? "Witness account — mechanism described"
      : "Medical summary — mechanism differs or incomplete";
  }
  if (/charge wording|corrected/.test(label)) {
    return side === "A"
      ? `Original charge sheet — ${m.chargeWording}`
      : "Corrected charge sheet — amended particulars on bundle";
  }
  return side === "A"
    ? `${c.sourceA} — partial account on bundle`
    : `${c.sourceB} — conflicting account; unresolved on papers`;
}

function contradictionsSection(m: StrategyCorpusManifest): string {
  if (!m.contradictions.length) return "";

  const lines = [
    "=== SECTION: CONTRADICTIONS ===",
    "",
    "# Contradictions on served papers (Fictional)",
    "",
    "**Human review:** provisional — do not treat conflicting points as agreed facts.",
    "",
  ];

  for (const c of m.contradictions) {
    const sourceA = contradictionSourceDetail(c, "A", m);
    const sourceB = contradictionSourceDetail(c, "B", m);
    lines.push(
      `## CONTRADICTION — ${c.label}`,
      "",
      "**Status:** conflicting — unresolved on papers",
      "**Source section:** Charge sheet / MG5 / witness material",
      `**Source basis:** ${sourceA} conflicts with ${sourceB}`,
      `**Source A (${c.sourceA}):** ${sourceA}`,
      `**Source B (${c.sourceB}):** ${sourceB}`,
      "",
    );
  }

  return lines.join("\n");
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
    "**Human review:** serious/provisional offence — solicitor review before fixing hearing position.",
    "",
  ].join("\n");
}

function chargeSection(m: StrategyCorpusManifest): string {
  const corrected = m.failureModeTags.includes("corrected_charge_sheet");
  const timingContra = m.failureModeTags.includes("timing_contradiction");
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
  if (corrected || timingContra) {
    lines.push(
      "",
      "**Note:** Compare particulars with MG5 — dates/wording may conflict on export.",
      "**Particulars of offence date:** 14 March 2024",
    );
  }
  if (corrected) {
    lines.push(
      "**Corrected particulars date:** 15 March 2024",
      "**Original charge sheet retained** — corrected sheet also on file.",
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

  const timingContra = m.failureModeTags.includes("timing_contradiction");
  const cctvConflict =
    m.failureModeTags.includes("partial_cctv") ||
    m.failureModeTags.includes("cctv_stills_no_master");

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
    timingContra
      ? "Prosecution summary records the incident on the evening of 15 March 2024 — compare with charge particulars."
      : "Prosecution summary on current papers remains provisional. Core identification, attribution, and continuity material may be outstanding.",
    "",
    "## Evidence relied upon (current papers)",
    "",
  ];

  let n = 1;
  for (const doc of m.documentInventory.filter((d) => d.status !== "outstanding").slice(0, 5)) {
    lines.push(`${n}. **${doc.docType}** — ${doc.status} on export`);
    n++;
  }

  if (cctvConflict) {
    lines.push(
      "",
      "CCTV footage is being arranged/held by OIC; MG6 lists export/continuity as outstanding or not yet served.",
    );
  }

  if (m.failureModeTags.includes("cad_summary_no_full_cad")) {
    lines.push(
      "",
      "Partial CAD extract attached — 00:24 dispatch reference; full CAD log retained/outstanding.",
    );
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
    contradictionsSection(m),
    mg6Section(m),
    disclosureIndex(m),
  ].join("\n");
}

export function corpusCacheTextPath(caseId: string): string {
  return `artifacts/casebrain-auditor/cache/strategy-corpus/text/${caseId}.md`;
}
