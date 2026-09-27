/**
 * One family/status owner for solicitor-facing surfaces.
 * Sub-items stay split: summary served ≠ full recording/master/download served.
 */

import type { MaterialStatus, NormalisedMaterialRow } from "@/lib/criminal/bundle-truth-types";

export type EvidenceSubFamily =
  | "interview_summary"
  | "interview_full"
  | "cctv_stills"
  | "cctv_master"
  | "cad_summary"
  | "cad_999_audio"
  | "phone_contact"
  | "phone_download"
  | "bwv"
  | "custody"
  | "other";

export type FamilyStatus = "served" | "outstanding" | "review" | "partial";

export type FamilyStatusOwner = {
  family: EvidenceSubFamily;
  status: FamilyStatus;
  label: string;
  ref: string | null;
};

function normal(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function classifyEvidenceSubFamily(text: string, refs: string[] = []): EvidenceSubFamily {
  const n = normal(text);
  const ref = (refs[0] ?? "").toUpperCase();

  if (/\b(?:phone download|phone extraction|source extraction|subscriber|cell-site|tel\/)\b/.test(n)) {
    return "phone_download";
  }
  if (/\b(?:phone contact|handset|mobile phone|iphone|stolen phone)\b/.test(n) && !/\b(?:download|extraction|subscriber)\b/.test(n)) {
    return "phone_contact";
  }

  if (/\b(?:full 999 audio|999 audio|original audio\/log|original audio|emergency-call material)\b/.test(n)) {
    return "cad_999_audio";
  }
  if (/\b(?:cad and 999 summaries|cad \/ dispatch|cad log|cad incident|cad \/ 999)\b/.test(n)) {
    return /\b(?:original audio|full 999 audio|999 audio)\b/.test(n) ? "cad_999_audio" : "cad_summary";
  }
  if (ref.includes("EX-MUR-012") || /\b(?:cad|999)\b/.test(n)) {
    return /\b(?:999 audio|original audio|emergency-call)\b/.test(n) ? "cad_999_audio" : "cad_summary";
  }

  if (/\b(?:master footage|cctv master|export log|cctv continuity|full cctv)\b/.test(n)) {
    return "cctv_master";
  }
  if (/\b(?:cctv still|timing note|stills)\b/.test(n)) {
    return /\b(?:master|export log|continuity)\b/.test(n) ? "cctv_master" : "cctv_stills";
  }
  if (/\bcctv\b/.test(n)) {
    return /\b(?:master|export|continuity|full window)\b/.test(n) ? "cctv_master" : "cctv_stills";
  }

  if (/\b(?:full interview|interview recording|interview transcript|mg15)\b/.test(n)) {
    return "interview_full";
  }
  if (/\binterview summary\b/.test(n)) {
    return /\b(?:full recording|full transcript|recording\/transcript)\b/.test(n)
      ? "interview_full"
      : "interview_summary";
  }
  if (/\binterview\b/.test(n)) {
    return /\b(?:interview recording|interview transcript|recording\/transcript|full interview)\b/.test(n)
      ? "interview_full"
      : "interview_summary";
  }

  if (/\bbwv|body-worn\b/.test(n)) return "bwv";
  if (/\bcustody|pace\b/.test(n)) return "custody";
  return "other";
}

export function familyStatusFromMaterial(status: MaterialStatus | string): FamilyStatus {
  const s = String(status).toLowerCase();
  if (s === "served") return "served";
  if (s === "outstanding" || s === "absent" || s === "missing") return "outstanding";
  if (s === "partial" || s === "draft" || s === "unsigned" || s === "incomplete") return "partial";
  return "review";
}

export function buildFamilyStatusOwner(rows: Array<Pick<NormalisedMaterialRow, "label" | "status" | "scheduleRef">>): Map<EvidenceSubFamily, FamilyStatusOwner> {
  const owner = new Map<EvidenceSubFamily, FamilyStatusOwner>();
  for (const row of rows) {
    const family = classifyEvidenceSubFamily(row.label, row.scheduleRef ? [row.scheduleRef] : []);
    if (family === "other") continue;
    const next: FamilyStatusOwner = {
      family,
      status: familyStatusFromMaterial(row.status),
      label: row.label,
      ref: row.scheduleRef,
    };
    const prev = owner.get(family);
    if (!prev || familyStatusRank(next.status) > familyStatusRank(prev.status)) {
      owner.set(family, next);
    }
  }
  return owner;
}

function familyStatusRank(status: FamilyStatus): number {
  if (status === "outstanding") return 3;
  if (status === "partial") return 2;
  if (status === "served") return 1;
  return 0;
}

export function clientStatusPhrase(status: FamilyStatus): string {
  switch (status) {
    case "served":
      return "on the papers";
    case "partial":
      return "only partly on the papers";
    case "outstanding":
      return "not on the papers yet";
    default:
      return "not safely confirmed on the papers";
  }
}

export function buildClientPacketFacts(rows: Array<Pick<NormalisedMaterialRow, "label" | "status" | "scheduleRef">>): string[] {
  const owner = buildFamilyStatusOwner(rows);
  const facts: string[] = [];
  const seen = new Set<string>();
  for (const item of owner.values()) {
    const line = `${item.label} — ${clientStatusPhrase(item.status)}.`;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    facts.push(line);
  }
  return facts;
}

export function buildClientPacketSummary(input: {
  allegation?: string | null;
  rows: Array<Pick<NormalisedMaterialRow, "label" | "status" | "scheduleRef">>;
}): string {
  const facts = buildClientPacketFacts(input.rows);
  const charge = input.allegation?.trim();
  const head = charge
    ? `This is a provisional client update from the current papers (${charge}).`
    : "This is a provisional client update from the current papers.";
  if (!facts.length) {
    return `${head} No named disclosure items are safely ready to report yet.`;
  }
  return `${head} ${facts.slice(0, 4).join(" ")} Nothing here is a final position.`;
}
