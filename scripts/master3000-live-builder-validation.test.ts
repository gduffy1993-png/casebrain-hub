import { describe, expect, it } from "vitest";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";

const digitalBundle = [
  "=== SECTION: CHARGE ===",
  "Harassment by messages.",
  "=== SECTION: MG5 ===",
  "The prosecution relies on screenshots and a phone download summary.",
  "=== SECTION: MG6 ===",
  "MG6C/001 — Phone extraction source material — outstanding — not on bundle.",
  "MG6C/002 — Message export / screenshot pack — outstanding — not on bundle.",
  "MG6C/003 — Subscriber / account data — outstanding — not on bundle.",
  "MG6C/004 — Complainant MG11 statement — outstanding — not on bundle.",
  "MG6C/005 — Call logs — outstanding — not on bundle.",
].join("\n");

const genericBundle = [
  "=== SECTION: MG6 ===",
  "Further papers on the file.",
  "Additional source-material issues noted by index.",
  "Further papers on the file.",
].join("\n");

const bwvRobberyBundle = [
  "=== SECTION: CHARGE ===",
  "Robbery, contrary to s.8 Theft Act 1968.",
  "=== SECTION: MG6 ===",
  "Full CCTV master footage — outstanding.",
  "CCTV continuity / export log — outstanding.",
  "Body worn video download outstanding — outstanding.",
].join("\n");

describe("master3000 live-builder validation invariants", () => {
  it("does not collapse concrete digital disclosure chases into a vague source-material label", () => {
    const brief = buildDisclosureChaseBrief({
      caseId: "fixture-digital",
      caseTitle: "Digital harassment fixture",
      clientLabel: "Digital harassment fixture",
      allegation: "Harassment by messages",
      stage: "First Appearance",
      hearingStatus: "No reliable hearing date",
      hearingDateIso: null,
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: null,
      bundleText: digitalBundle,
    });

    const labels = brief.items.map((item) => item.label).join("\n");
    const allVisible = brief.items
      .flatMap((item) => [item.label, item.whyItMatters, item.draftChaseWording, item.courtLine, ...item.mergedFrom])
      .join("\n");

    expect(labels).not.toMatch(/^Outstanding source material on disclosure schedule$/im);
    expect(allVisible).toMatch(/Phone extraction|Subscriber|Message export|screenshot/i);
  });

  it("keeps genuinely generic source-material groups generic rather than inventing specificity", () => {
    const brief = buildDisclosureChaseBrief({
      caseId: "fixture-generic",
      caseTitle: "Generic disclosure fixture",
      clientLabel: "Generic disclosure fixture",
      allegation: "Unknown",
      stage: "Unknown",
      hearingStatus: "No reliable hearing date",
      hearingDateIso: null,
      bundleHealth: "Thin",
      positionStatus: "Not recorded",
      battleboard: null,
      bundleText: genericBundle,
    });

    const text = brief.items
      .flatMap((item) => [item.label, item.draftChaseWording, ...item.mergedFrom])
      .join("\n");

    expect(text).toMatch(/source material|further papers/i);
    expect(text).not.toMatch(/Phone extraction|Subscriber|CCTV master|BWV export/i);
  });

  it("does not let the broad CCTV/video family swallow source-backed BWV chase items", () => {
    const brief = buildDisclosureChaseBrief({
      caseId: "fixture-bwv-robbery",
      caseTitle: "Robbery with BWV outstanding",
      clientLabel: "Robbery with BWV outstanding",
      allegation: "Robbery, contrary to s.8 Theft Act 1968.",
      stage: "First Appearance",
      hearingStatus: "No reliable hearing date",
      hearingDateIso: null,
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: null,
      bundleText: bwvRobberyBundle,
    });

    expect(brief.items.some((item) => item.familyId === "bwv" && /body-worn video|bwv/i.test(item.label))).toBe(true);
    expect(brief.items.some((item) => item.familyId === "cctv_master" && /body-worn|bwv/i.test(item.label))).toBe(false);
  });
});
