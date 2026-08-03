/**
 * Bound generator port for the accepted diverse V2.1.4.4 technical pilot scale gate.
 * Generates one fictional matter source pack per request; does not invent PDF bytes
 * unless an actual PDF write succeeds. Truth remains sealed until candidate freeze.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { semanticFingerprint, sha256Hex } from "./hash";
import { assertPathNotUnderForbidden } from "./paths";
import type {
  GeneratorCaseCandidate,
  GeneratorCaseRequest,
  Stage3000GeneratorPort,
} from "./types";

export const DIVERSE_V2144_GENERATOR_VERSION_PIN =
  "V2.1.4.4-DIVERSE-SECOND-BOUND@1.0.0" as const;

type Alloc = { familyId: string; tier: string; count: number };

const DEFENCE_POSITIONS = [
  "factual_denial",
  "self_defence",
  "alibi",
  "identification_dispute",
  "consent_dispute",
  "duress_pressure",
  "lack_of_intent",
  "mistaken_attribution",
  "section_45_indicator",
  "abuse_of_process_argument",
  "no_case_to_answer_focus",
  "basis_of_plea_limited",
] as const;

const PROCEDURE_STAGES = [
  "police_investigation",
  "charge_decision",
  "first_appearance",
  "pet",
  "ptph",
  "pcmoh",
  "trial_prep",
  "newton",
  "sentence",
  "appeal_structure",
  "breach_proceedings",
  "reopening_stat_dec",
] as const;

const EVIDENCE_TYPES = [
  "mg11_signed",
  "mg11_draft",
  "cctv_clip",
  "cctv_master_referred",
  "bwv_clip",
  "phone_extraction_partial",
  "cdr_schedule",
  "anpr_hit",
  "dna_sfr",
  "fingerprint_partial",
  "medical_report",
  "abe_transcript",
  "bank_csv",
  "social_media_screenshots",
  "custody_record_extract",
  "interview_mg15",
  "forensic_continuity_gap",
  "translation_disputed",
  "third_party_yjs",
  "prison_call_log",
] as const;

function loadPlan(repoRoot: string): Array<{ familyId: string; tier: string }> {
  const allocPath = path.join(
    repoRoot,
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/catalogues/new3000-composition-allocation.json",
  );
  const allocDoc = JSON.parse(fs.readFileSync(allocPath, "utf8")) as {
    allocations: Alloc[];
  };
  const plan: Array<{ familyId: string; tier: string }> = [];
  for (const a of allocDoc.allocations) {
    for (let i = 0; i < a.count; i++) plan.push({ familyId: a.familyId, tier: a.tier });
  }
  if (plan.length !== 3000) {
    throw new Error(`composition allocation must total 3000 (got ${plan.length})`);
  }
  return plan;
}

function buildMatterText(args: {
  caseId: string;
  orderIndex: number;
  familyId: string;
  tier: string;
  seed: string;
}): string {
  const { caseId, orderIndex, familyId, tier, seed } = args;
  const defence = DEFENCE_POSITIONS[orderIndex % DEFENCE_POSITIONS.length];
  const procedure = PROCEDURE_STAGES[(orderIndex * 3) % PROCEDURE_STAGES.length];
  const evidenceOwned = EVIDENCE_TYPES.filter((_, idx) => (orderIndex + idx * 13) % 5 !== 0).slice(
    0,
    6 + (orderIndex % 5),
  );
  const missing = EVIDENCE_TYPES.filter((e) => !evidenceOwned.includes(e)).slice(
    0,
    orderIndex % 10 === 0 ? 1 + (orderIndex % 3) : 0,
  );
  return [
    `FICTIONAL TEST MATERIAL — not an operative police, CPS, court or solicitor document.`,
    `caseId=${caseId}`,
    `seed=${seed}`,
    `family=${familyId}`,
    `tier=${tier}`,
    `defence=${defence}`,
    `procedure=${procedure}`,
    `evidence_served=${evidenceOwned.join(",") || "none"}`,
    `evidence_absent=${missing.join(",") || "none"}`,
    `note=Absent documents have no invented pages. Truth remains sealed until candidate freeze.`,
  ].join("\n");
}

export class DiverseV2144GeneratorPort implements Stage3000GeneratorPort {
  readonly portId = "v2.1.4.4-diverse-second-generator-port";
  readonly generatorVersionPin = DIVERSE_V2144_GENERATOR_VERSION_PIN;
  readonly isBound = true;

  private readonly repoRoot: string;
  private readonly plan: Array<{ familyId: string; tier: string }>;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
    this.plan = loadPlan(repoRoot);
  }

  async generateCase(request: GeneratorCaseRequest): Promise<GeneratorCaseCandidate> {
    for (const root of request.forbiddenRoots) {
      assertPathNotUnderForbidden(request.sourceRoot, [root]);
    }
    const slot = request.identity.globalSlot;
    if (slot < 0 || slot >= 3000) {
      throw new Error(`globalSlot out of range: ${slot}`);
    }
    const { familyId, tier } = this.plan[slot]!;
    const caseId = request.identity.caseId;
    const text = buildMatterText({
      caseId,
      orderIndex: slot,
      familyId,
      tier,
      seed: request.identity.seed,
    });
    const contentSha256 = sha256Hex(text);

    const outDir = path.join(request.sourceRoot, caseId);
    fs.mkdirSync(outDir, { recursive: true });
    const matter = {
      schemaVersion: "diverse3000-v2144-bound-matter@1.0.0",
      caseId,
      orderIndex: slot,
      primaryFamily: familyId,
      tier,
      seed: request.identity.seed,
      wave: request.identity.wave,
      shard: request.identity.shard,
      generatorVersionPin: this.generatorVersionPin,
      allegationNarrative: text,
      pdfPresent: false,
      pdfNote: "No PDF claimed — actual PDF bytes not written by this bound port.",
      truthSealed: true,
    };
    const matterPath = path.join(outDir, "matter-skeleton.json");
    fs.writeFileSync(matterPath, `${JSON.stringify(matter, null, 2)}\n`, "utf8");
    fs.writeFileSync(path.join(outDir, "source-text.txt"), text, "utf8");
    const fingerprint = {
      caseId,
      matterSha256: sha256Hex(fs.readFileSync(matterPath)),
      sourceTextSha256: contentSha256,
      packetSha256: sha256Hex(
        Buffer.concat([
          crypto.createHash("sha256").update(fs.readFileSync(matterPath)).digest(),
          crypto.createHash("sha256").update(text).digest(),
        ]),
      ),
    };
    fs.writeFileSync(
      path.join(outDir, "packet-fingerprint.json"),
      `${JSON.stringify(fingerprint, null, 2)}\n`,
      "utf8",
    );

    return {
      caseId,
      contentText: text,
      contentSha256,
      semanticFingerprint: semanticFingerprint(
        // Exclude names/dates/salts/IDs from semantic fingerprint inputs where possible
        [
          `family=${familyId}`,
          `tier=${tier}`,
          `defence=${DEFENCE_POSITIONS[slot % DEFENCE_POSITIONS.length]}`,
          `procedure=${PROCEDURE_STAGES[(slot * 3) % PROCEDURE_STAGES.length]}`,
          `evidence=${EVIDENCE_TYPES.filter((_, idx) => (slot + idx * 13) % 5 !== 0)
            .slice(0, 6 + (slot % 5))
            .join(",")}`,
        ].join("|"),
      ),
      generatorVersionPin: this.generatorVersionPin,
    };
  }
}

export function createDiverseV2144GeneratorPort(repoRoot: string): Stage3000GeneratorPort {
  return new DiverseV2144GeneratorPort(repoRoot);
}
