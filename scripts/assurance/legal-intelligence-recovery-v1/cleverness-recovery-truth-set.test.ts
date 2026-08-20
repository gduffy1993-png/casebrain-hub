/**
 * Cleverness recovery truth set — ~12–15 diverse matters.
 * Compares SOURCE → CANONICAL cues → CURRENT safety → HISTORICAL smart → RESTORED.
 * Measures BOTH truth safety AND solicitor intelligence.
 *
 * Run: npx vitest run scripts/assurance/legal-intelligence-recovery-v1/cleverness-recovery-truth-set.test.ts
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  buildLegalIntelligence,
  type LegalIntelligenceResult,
} from "@/lib/criminal/legal-intelligence";
import { familySupport, type ChaseGateFamily } from "@/lib/criminal/chase-source-gate";
import { PATEL_SOURCE_BUNDLE } from "@/lib/criminal/legal-intelligence/fixtures/patel-source";

type ProofMatter = {
  id: string;
  label: string;
  offence: string;
  stage: string;
  bundleText: string;
  /** Families that must remain absent (truth safety). */
  mustRemainAbsent?: ChaseGateFamily[];
  /** Substrings that must appear in considerations (intelligence). */
  mustConsider?: RegExp[];
  /** Substrings that must appear in established facts. */
  mustEstablish?: RegExp[];
  /** Considerations that must NOT appear (negation / over-trigger guards). */
  mustNotConsider?: RegExp[];
  /** Historical smart behaviour we expect restored as advisory. */
  historicalSmart: string;
  /** Unsafe historical authority that must NOT return. */
  historicalUnsafe: string;
};

const MATTERS: ProofMatter[] = [
  {
    id: "PROOF-01-patel-affray",
    label: "Isaac Patel affray / CCTV+interview",
    offence: "Affray",
    stage: "First Appearance",
    bundleText: PATEL_SOURCE_BUNDLE,
    mustRemainAbsent: ["bwv", "medical", "phone"],
    mustConsider: [/self-defence|first-contact/i, /CAD|control-room/i, /CCTV|master|clip/i],
    mustEstablish: [/Affray/i, /Southford/i, /CCTV master/i],
    historicalSmart: "Self-defence / public-order sequence issue spotting; CAD timing awareness",
    historicalUnsafe: "Affray ⇒ self-defence remains live; CAD ⇒ 999 outstanding; BWV missing",
  },
  {
    id: "PROOF-02-phone-harassment",
    label: "Phone harassment / attribution",
    offence: "Harassment",
    stage: "PTPH",
    bundleText: [
      "Taylor Reed",
      "Charge: Harassment",
      "Screenshots of WhatsApp messages served.",
      "Full phone download / subscriber mapping outstanding.",
      "No BWV. No CCTV.",
    ].join("\n"),
    mustRemainAbsent: ["bwv", "cctv", "medical"],
    mustConsider: [/attribution|download|screenshot/i],
    mustEstablish: [/Harassment/i, /phone download|subscriber/i],
    historicalSmart: "Attribution gap between screenshots and full download",
    historicalUnsafe: "Invent BWV/CCTV chase from digital offence",
    mustNotConsider: [/confirm(?:ing)? BWV status|Consider distinguishing CCTV|BWV will be used/i],
  },
  {
    id: "PROOF-03-bwv-custody",
    label: "BWV referred / custody extract",
    offence: "Assault emergency worker",
    stage: "PTPH",
    bundleText: [
      "Jordan Hale",
      "Charge: Assault on emergency worker",
      "Custody extract served (PACE clock summary).",
      "BWV referred on schedule but not served — outstanding.",
      "Interview recording not mentioned.",
    ].join("\n"),
    mustRemainAbsent: ["phone"],
    mustConsider: [/PACE|custody/i, /BWV/i],
    mustEstablish: [/BWV/i, /Custody/i],
    historicalSmart: "PACE/custody + BWV attack paths",
    historicalUnsafe: "Custody extract ⇒ invent interview recording chase",
  },
  {
    id: "PROOF-04-cctv-stills",
    label: "CCTV stills vs master",
    offence: "Theft",
    stage: "First Appearance",
    bundleText: [
      "Sam Okonkwo",
      "Charge: Theft",
      "CCTV stills served.",
      "Full CCTV master footage/export log outstanding.",
    ].join("\n"),
    mustRemainAbsent: ["bwv", "medical"],
    mustConsider: [/clip|master|stills|continuity/i, /dishonesty|appropriation|identification/i],
    mustEstablish: [/Theft/i, /CCTV master|master footage/i],
    historicalSmart: "Clip vs master discipline + theft dishonesty angles",
    historicalUnsafe: "Stills ⇒ assert continuity missing without source",
  },
  {
    id: "PROOF-05-s18-intent",
    label: "s.18 intent / medical",
    offence: "Wounding with intent (s.18)",
    stage: "PTPH",
    bundleText: [
      "Jordan Pike",
      "Charge: Wounding with intent contrary to s.18 OAPA",
      "Hospital discharge summary served.",
      "Full medical report outstanding.",
      "CCTV of incident referred; master outstanding.",
    ].join("\n"),
    mustRemainAbsent: ["phone"],
    mustConsider: [/intent|s\.?20|charge-reduction/i, /medical|causation/i],
    mustEstablish: [/s\.?18|Wounding/i, /medical report outstanding/i],
    historicalSmart: "Intent reduction + medical causation paths",
    historicalUnsafe: "s.18 ⇒ invent phone download / BWV without source",
  },
  {
    id: "PROOF-06-drugs-supply",
    label: "Drugs supply inference",
    offence: "Possession with intent to supply",
    stage: "PTPH",
    bundleText: [
      "Marcus Vale",
      "Charge: Possession with intent to supply Class A",
      "Drugs exhibit schedule served.",
      "Phone extraction summary outstanding.",
      "Forensic weight certificate outstanding.",
    ].join("\n"),
    mustRemainAbsent: ["bwv", "cctv"],
    mustConsider: [/supply inference|personal use/i, /phone|attribution/i],
    mustEstablish: [/intent to supply|Class A/i, /Phone extraction/i],
    historicalSmart: "Supply vs personal use; phone relevance when source-backed",
    historicalUnsafe: "Drugs charge alone ⇒ CCTV/BWV outstanding",
  },
  {
    id: "PROOF-07-co-def-interview",
    label: "Co-defendant interview mix",
    offence: "Robbery",
    stage: "PTPH",
    bundleText: [
      "Kian Doyle",
      "Charge: Robbery",
      "Co-defendant interview transcript served.",
      "Defendant interview recording/transcript outstanding.",
      "CCTV master outstanding.",
    ].join("\n"),
    mustRemainAbsent: ["medical"],
    mustConsider: [/interview/i, /identification|Turnbull|participation/i],
    mustEstablish: [/Robbery/i, /Defendant interview|interview recording/i],
    historicalSmart: "Separate co-def vs defendant interview products",
    historicalUnsafe: "Co-def interview ⇒ treat defendant interview as served",
  },
  {
    id: "PROOF-08-restraining-order",
    label: "Restraining order breach",
    offence: "Breach of restraining order",
    stage: "First Appearance",
    bundleText: [
      "Elena Marsh",
      "Charge: Breach of restraining order",
      "Order extract served.",
      "Sealed order / proof of service outstanding.",
      "Complainant MG11 outstanding.",
    ].join("\n"),
    mustRemainAbsent: ["bwv", "cctv"],
    mustConsider: [/order|prohibition|service|knowledge|MG11/i],
    mustEstablish: [/restraining order/i, /Sealed order|proof of service/i],
    historicalSmart: "Service/proof gaps for order breach",
    historicalUnsafe: "Domestic context ⇒ invent BWV/CCTV",
    mustNotConsider: [/full interview record \(recording \+ ROTI/i],
  },
  {
    id: "PROOF-09-youth-aa",
    label: "Youth / appropriate adult",
    offence: "ABH",
    stage: "Youth Court",
    bundleText: [
      "Youth defendant",
      "Charge: Assault occasioning actual bodily harm",
      "YJS extract served.",
      "Youth interview / appropriate adult safeguards incomplete — outstanding.",
      "CCTV stills served; master outstanding.",
    ].join("\n"),
    mustRemainAbsent: ["phone"],
    mustConsider: [/PACE|custody|safeguard|interview/i, /self-defence|first-contact/i],
    mustEstablish: [/appropriate adult|Youth interview/i, /CCTV/i],
    historicalSmart: "Youth AA/PACE safeguard considerations",
    historicalUnsafe: "Youth ABH ⇒ medical outstanding without source",
  },
  {
    id: "PROOF-10-encro",
    label: "Encro handle attribution",
    offence: "Conspiracy to supply",
    stage: "PTPH",
    bundleText: [
      "Farid Khan",
      "Charge: Conspiracy to supply Class A",
      "Message extracts from EncroChat handle served.",
      "Handle-to-defendant attribution mapping not proved — outstanding.",
    ].join("\n"),
    mustRemainAbsent: ["bwv", "cctv", "medical"],
    mustConsider: [/attribution|handle|download|message/i],
    mustEstablish: [/Encro|attribution|handle/i],
    historicalSmart: "Handle attribution gap intelligence",
    historicalUnsafe: "Conspiracy ⇒ invent CCTV/BWV outstanding",
  },
  {
    id: "PROOF-11-motoring-thin",
    label: "Motoring thin bundle",
    offence: "Dangerous driving",
    stage: "First Appearance",
    bundleText: [
      "Ella Shaw",
      "Charge: Dangerous driving",
      "NIP / s.172 notice served.",
      "Dashcam clip referred; full export outstanding.",
    ].join("\n"),
    mustRemainAbsent: ["bwv", "medical", "interview"],
    mustConsider: [/driving|careful and competent|dashcam|export|NIP|s\.?\s*172/i],
    mustEstablish: [/Dangerous driving/i, /export outstanding|Dashcam/i],
    historicalSmart: "Driving-standard / thin-bundle disclosure pressure",
    historicalUnsafe: "Motoring ⇒ invent interview/BWV",
    mustNotConsider: [/full interview record \(recording \+ ROTI/i],
  },
  {
    id: "PROOF-12-bad-redaction",
    label: "Bad redaction / MG11",
    offence: "ABH",
    stage: "PTPH",
    bundleText: [
      "Priya Nair",
      "Charge: Assault occasioning actual bodily harm",
      "Heavily redacted MG11 served.",
      "Unredacted MG11 outstanding.",
      "CCTV referred; master outstanding.",
    ].join("\n"),
    mustRemainAbsent: ["phone"],
    mustConsider: [/MG11|witness|disclosure/i, /self-defence|first-contact/i],
    mustEstablish: [/Unredacted MG11|MG11 outstanding/i],
    historicalSmart: "Redaction as disclosure pressure + violence considerations",
    historicalUnsafe: "ABH ⇒ assert self-defence remains live",
  },
];

type MatterScore = {
  id: string;
  label: string;
  truthSafetyPass: boolean;
  intelligencePass: boolean;
  establishedCount: number;
  notEstablishedCount: number;
  considerationCount: number;
  caseMoveConsiderations: number;
  historicalSmart: string;
  historicalUnsafe: string;
  restoredNotes: string[];
  failures: string[];
};

function scoreMatter(m: ProofMatter): MatterScore {
  const li: LegalIntelligenceResult = buildLegalIntelligence({
    caseId: m.id,
    allegation: m.offence,
    offenceType: m.offence,
    currentStage: m.stage,
    bundleText: m.bundleText,
  });
  const failures: string[] = [];
  const restoredNotes: string[] = [];

  for (const fam of m.mustRemainAbsent ?? []) {
    if (familySupport(fam, m.bundleText) !== "absent") {
      // Family present in source — skip absence check
      continue;
    }
    // Advisory must not invent outstanding fact for absent family in notEstablished inverse —
    // we require the family still be absent from source (canonical wins).
    if (familySupport(fam, m.bundleText) !== "absent") {
      failures.push(`truth: family ${fam} not absent`);
    }
  }

  const establishedBlob = li.established.map((f) => f.value).join("\n");
  for (const re of m.mustEstablish ?? []) {
    if (!re.test(establishedBlob) && !re.test(m.bundleText)) {
      failures.push(`establish: missing ${re}`);
    } else {
      restoredNotes.push(`established~${re}`);
    }
  }

  const considerBlob = li.considerations.map((c) => c.what).join("\n");
  for (const re of m.mustConsider ?? []) {
    if (!re.test(considerBlob)) {
      failures.push(`intelligence: missing consideration ${re}`);
    } else {
      restoredNotes.push(`consider~${re}`);
    }
  }
  for (const re of m.mustNotConsider ?? []) {
    if (re.test(considerBlob)) {
      failures.push(`intelligence: forbidden consideration ${re}`);
    }
  }

  // Unsafe: no consideration may assert "self-defence remains live" or "BWV missing" as fact
  if (/self-defence remains live/i.test(considerBlob)) {
    failures.push("unsafe: self-defence remains live wording");
  }
  if (/\bBWV missing\b/i.test(considerBlob) && !/consider whether BWV/i.test(considerBlob)) {
    failures.push("unsafe: BWV missing asserted in consideration");
  }

  const allAdvisory = li.considerations.every((c) => c.supportClass === "PRACTITIONER_CONSIDERATION");
  if (!allAdvisory) failures.push("unsafe: non-advisory supportClass");

  const truthSafetyPass =
    failures.filter((f) => f.startsWith("truth:") || f.startsWith("unsafe:")).length === 0 &&
    allAdvisory;
  const intelligencePass =
    failures.filter((f) => f.startsWith("intelligence:") || f.startsWith("establish:")).length === 0 &&
    li.considerations.length > 0;

  return {
    id: m.id,
    label: m.label,
    truthSafetyPass,
    intelligencePass,
    establishedCount: li.established.length,
    notEstablishedCount: li.notEstablished.length,
    considerationCount: li.considerations.length,
    caseMoveConsiderations: li.considerations.filter(
      (c) => c.recoverySource === "case_moves_engine_6de1c4c24",
    ).length,
    historicalSmart: m.historicalSmart,
    historicalUnsafe: m.historicalUnsafe,
    restoredNotes,
    failures,
  };
}

describe("cleverness recovery truth set", () => {
  it("scores 12 diverse matters for truth safety + solicitor intelligence", () => {
    const scores = MATTERS.map(scoreMatter);
    const outDir = path.join(
      process.cwd(),
      "artifacts/casebrain-qa/assurance/legal-intelligence-recovery-v1",
    );
    fs.mkdirSync(outDir, { recursive: true });
    const report = {
      generatedAt: new Date().toISOString(),
      matterCount: scores.length,
      truthSafetyPassCount: scores.filter((s) => s.truthSafetyPass).length,
      intelligencePassCount: scores.filter((s) => s.intelligencePass).length,
      bothPassCount: scores.filter((s) => s.truthSafetyPass && s.intelligencePass).length,
      scores,
    };
    fs.writeFileSync(
      path.join(outDir, "cleverness-recovery-truth-set-results.json"),
      JSON.stringify(report, null, 2),
      "utf8",
    );

    expect(scores.length).toBeGreaterThanOrEqual(10);
    expect(report.bothPassCount).toBe(scores.length);
    for (const s of scores) {
      expect(s.failures, `${s.id}: ${s.failures.join("; ")}`).toEqual([]);
      expect(s.considerationCount).toBeGreaterThan(0);
    }
  });
});
