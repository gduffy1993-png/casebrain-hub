import type { AuditTier } from "./types";

export type ChangeKind =
  | "css_or_visual_copy"
  | "wording_template"
  | "single_invariant"
  | "evidence_state_or_provenance"
  | "canonical_state_or_parser"
  | "release_gate";

export function recommendAuditTier(changeKind: ChangeKind): {
  tier: AuditTier;
  reason: string;
  fullCorpusAllowed: boolean;
} {
  switch (changeKind) {
    case "css_or_visual_copy":
      return { tier: "A", reason: "Cosmetic/UI-only change: targeted fixtures are enough.", fullCorpusAllowed: false };
    case "wording_template":
      return { tier: "B", reason: "Wording template can affect repeated surfaces: run 20-50 contrasting cases.", fullCorpusAllowed: false };
    case "single_invariant":
      return { tier: "B", reason: "Focused invariant needs contrasting and opposite-direction cases.", fullCorpusAllowed: false };
    case "evidence_state_or_provenance":
      return { tier: "D", reason: "State/provenance changes can affect many workflows: run representative stress set before full scale.", fullCorpusAllowed: false };
    case "canonical_state_or_parser":
      return { tier: "E", reason: "Canonical/parser changes justify full structural corpus run after lower tiers pass.", fullCorpusAllowed: true };
    case "release_gate":
      return { tier: "E", reason: "Release gate requires broad corpus evidence plus browser/UI representative sweep.", fullCorpusAllowed: true };
  }
}

