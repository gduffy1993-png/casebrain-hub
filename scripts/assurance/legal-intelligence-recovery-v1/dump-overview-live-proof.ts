/**
 * Dump restored Overview live-proof samples for 5 representative matters.
 * Run: npx tsx scripts/assurance/legal-intelligence-recovery-v1/dump-overview-live-proof.ts
 */
import fs from "node:fs";
import path from "node:path";
import {
  buildLegalIntelligence,
  considerationsForSurface,
} from "@/lib/criminal/legal-intelligence";
import { PATEL_SOURCE_BUNDLE } from "@/lib/criminal/legal-intelligence/fixtures/patel-source";
import { evidenceMentionStatus } from "@/lib/criminal/legal-intelligence/evidence-mention";

const matters = [
  {
    id: "LIVE-01-patel",
    label: "Patel affray",
    offence: "Affray",
    bundleText: PATEL_SOURCE_BUNDLE,
    note: "First-contact/SD, CAD, CCTV clip/master, interview modality, continuity, disclosure",
  },
  {
    id: "LIVE-02-phone",
    label: "Digital/phone harassment",
    offence: "Harassment",
    bundleText: [
      "Taylor Reed",
      "Charge: Harassment",
      "Screenshots of WhatsApp messages served.",
      "Full phone download / subscriber mapping outstanding.",
      "No BWV. No CCTV.",
    ].join("\n"),
    note: "Attribution; negation must not fire BWV/CCTV",
  },
  {
    id: "LIVE-03-bwv-cctv",
    label: "Violence BWV/CCTV",
    offence: "Assault on emergency worker",
    bundleText: [
      "Jordan Hale",
      "Charge: Assault on emergency worker",
      "Custody extract served (PACE clock summary).",
      "BWV referred on schedule but not served — outstanding.",
      "Interview recording not mentioned.",
    ].join("\n"),
    note: "BWV tactical; no interview invent",
  },
  {
    id: "LIVE-04-order-breach",
    label: "Order breach thin",
    offence: "Breach of restraining order",
    bundleText: [
      "Elena Marsh",
      "Charge: Breach of restraining order",
      "Order extract served.",
      "Sealed order / proof of service outstanding.",
      "Complainant MG11 outstanding.",
    ].join("\n"),
    note: "Order/service/MG11 intelligence",
  },
  {
    id: "LIVE-05-motoring",
    label: "Motoring / mixed thin",
    offence: "Dangerous driving",
    bundleText: [
      "Ella Shaw",
      "Charge: Dangerous driving",
      "NIP / s.172 notice served.",
      "Dashcam clip referred; full export outstanding.",
    ].join("\n"),
    note: "Driving standard + dashcam export",
  },
];

const results = matters.map((m) => {
  const li = buildLegalIntelligence({
    caseId: m.id,
    allegation: m.offence,
    offenceType: m.offence,
    bundleText: m.bundleText,
  });
  const overview = considerationsForSurface(li, "overview");
  const chaseAdv = considerationsForSurface(li, "cps_chase");
  return {
    id: m.id,
    label: m.label,
    note: m.note,
    families: {
      bwv: evidenceMentionStatus("bwv", m.bundleText),
      cctv: evidenceMentionStatus("cctv", m.bundleText),
      interview: evidenceMentionStatus("interview", m.bundleText),
    },
    establishedCount: li.established.length,
    notEstablishedCount: li.notEstablished.length,
    considerationCount: li.considerations.length,
    overviewCount: overview.length,
    cpsChaseAdvisoryCount: chaseAdv.length,
    establishedSample: li.established.slice(0, 6).map((f) => f.value),
    notEstablishedSample: li.notEstablished.map((n) => n.label),
    overviewSample: overview.slice(0, 8).map((c) => ({
      id: c.id,
      what: c.what,
      supportClass: c.supportClass,
    })),
    comparisons: {
      OLD_SMART: "Historical clever/unsafe-as-fact (see HUMAN-REVIEW-PACK)",
      CURRENT_SAFE_NEUTERED: "Baseline silence / gates only — no Overview LI",
      RESTORED_LIVE_OVERVIEW: overview.slice(0, 5).map((c) => c.what),
    },
  };
});

const outDir = path.join(
  "artifacts",
  "casebrain-qa",
  "assurance",
  "legal-intelligence-recovery-v1",
);
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "OVERVIEW-LIVE-PROOF-DUMP.json");
fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      branch: "programme/legal-intelligence-recovery-v1",
      results,
    },
    null,
    2,
  ),
);
console.log("Wrote", outPath);
console.log(
  JSON.stringify(
    results.map((r) => ({
      id: r.id,
      considerations: r.considerationCount,
      overview: r.overviewCount,
      chase: r.cpsChaseAdvisoryCount,
      families: r.families,
    })),
    null,
    2,
  ),
);
