/**
 * Overview product UI rebuild — presentation/projection regressions.
 * Counts must stay authoritative; chase buttons gated; negative-first not-established.
 */
import { describe, expect, it } from "vitest";
import { buildLegalIntelligence, considerationsForSurface } from "../lib/criminal/legal-intelligence";
import { PATEL_SOURCE_BUNDLE } from "../lib/criminal/legal-intelligence/fixtures/patel-source";
import { countAuthoritativeEvidenceRows } from "../lib/criminal/overview-presentation";
import {
  buildOverviewWorkspaceVm,
  canCopyChaseRequest,
  canCopyCourtWording,
  projectNotEstablishedSummary,
  projectNotEstablishedTitle,
  projectSolicitorDisplayText,
  OVERVIEW_TOP_ISSUE_LIMIT,
} from "../lib/criminal/overview-workspace";
import type { FiveAnswersEvidenceRow } from "../lib/criminal/five-answers/types";

const patelRows: FiveAnswersEvidenceRow[] = [
  { label: "CCTV stills served", existence: "served", reliability: "needs_review" },
  { label: "Full CCTV master footage/export log outstanding", existence: "missing", reliability: "needs_review" },
  { label: "Custody record pages 3-5 outstanding", existence: "incomplete", reliability: "needs_review" },
  { label: "Final signed MG11 outstanding", existence: "missing", reliability: "needs_review" },
  { label: "Interview summary served", existence: "served", reliability: "needs_review" },
  { label: "Full interview recording/transcript outstanding", existence: "referred_only", reliability: "needs_review" },
];

describe("overview display projection", () => {
  it("strips internal epistemic / id leakage", () => {
    expect(projectSolicitorDisplayText("SOURCE_FACT charge Affray")).not.toMatch(/SOURCE_FACT/);
    expect(projectSolicitorDisplayText("consider:self-defence first contact")).not.toMatch(/^consider:/i);
    expect(projectSolicitorDisplayText("Support: needs_review wording")).toMatch(/solicitor review/i);
    expect(projectSolicitorDisplayText("referred_only material")).toMatch(/referred only|referred/i);
  });

  it("negative-first for not-established (never outstanding-lead)", () => {
    const title = projectNotEstablishedTitle("999 audio outstanding");
    const summary = projectNotEstablishedSummary(
      "999 audio outstanding",
      "999 audio is not established",
    );
    expect(title).toMatch(/999|control-room/i);
    expect(title).not.toMatch(/outstanding/i);
    expect(summary.toLowerCase().startsWith("the current papers do not establish")).toBe(true);
    expect(summary).not.toMatch(/^999 audio outstanding/i);
  });
});

describe("overview workspace VM — counts + chase firewall", () => {
  it("keeps authoritative counts unchanged by ranking/filter", () => {
    const before = countAuthoritativeEvidenceRows(patelRows);
    const li = buildLegalIntelligence({
      caseId: "patel-ui",
      allegation: "Affray",
      bundleText: PATEL_SOURCE_BUNDLE,
      outstandingEvidence: patelRows
        .filter((r) => r.existence !== "served")
        .map((r) => r.label),
      servedEvidence: patelRows.filter((r) => r.existence === "served").map((r) => r.label),
    });
    const overview = considerationsForSurface(li, "overview");
    const vm = buildOverviewWorkspaceVm({
      caseId: "patel-ui",
      clientLabel: "Isaac Patel",
      chargeLabel: "Affray",
      courtLabel: "Southford Magistrates' Court",
      hearingLabel: "25 Aug 2026",
      matterConfidence: { level: "provisional" } as never,
      evidenceRows: patelRows,
      chaseItems: [
        {
          id: "chase-cctv",
          label: "Full CCTV master footage/export log outstanding",
          whyItMatters: "Sequence may be incomplete on stills alone.",
          draftChaseWording: "Please serve the full CCTV master / export log.",
          courtLine: "Full CCTV master remains outstanding on the papers.",
          urgency: "high",
        },
      ],
      legalIntelligence: li,
      overviewConsiderations: overview,
      safeCourtLine: "Position remains provisional pending outstanding disclosure.",
      safeCourtLineCanCopy: true,
      clientSummary: "Client update draft.",
    });

    expect(vm.counts.evidence).toEqual(before);
    expect(vm.counts.missingOutstanding).toBe(before.missing + before.referred);
    expect(vm.counts.incomplete).toBe(before.incomplete);
    expect(vm.counts.activeChases).toBe(1);
    // Ranking must not change totals even if top list is truncated in UI
    expect(vm.issues.length).toBeGreaterThan(OVERVIEW_TOP_ISSUE_LIMIT - 1);
  });

  it("chase copy only on source-supported chase items; considerations never enable chase", () => {
    const li = buildLegalIntelligence({
      caseId: "patel-chase",
      allegation: "Affray",
      bundleText: PATEL_SOURCE_BUNDLE,
    });
    const overview = considerationsForSurface(li, "overview");
    const vm = buildOverviewWorkspaceVm({
      caseId: "patel-chase",
      chargeLabel: "Affray",
      matterConfidence: { level: "provisional" } as never,
      evidenceRows: patelRows,
      chaseItems: [
        {
          id: "chase-cctv",
          label: "Full CCTV master footage/export log outstanding",
          draftChaseWording: "Please serve the full CCTV master / export log.",
          courtLine: "Full CCTV master remains outstanding.",
        },
      ],
      legalIntelligence: li,
      overviewConsiderations: overview,
    });

    const cctv = vm.issues.find((i) => /cctv master/i.test(i.title));
    expect(cctv).toBeTruthy();
    expect(canCopyChaseRequest(cctv)).toBe(true);
    expect(canCopyCourtWording(cctv)).toBe(true);

    const advisory = vm.issues.filter((i) => i.kind === "consideration" || i.kind === "not_established");
    expect(advisory.length).toBeGreaterThan(0);
    for (const issue of advisory) {
      expect(canCopyChaseRequest(issue)).toBe(false);
      expect(issue.statusLabel === "CONSIDER" || issue.statusLabel === "NOT ESTABLISHED").toBe(true);
    }
  });

  it("Patel acceptance: does not promote invent classes as outstanding gaps", () => {
    const li = buildLegalIntelligence({
      caseId: "patel-accept",
      allegation: "Affray",
      bundleText: PATEL_SOURCE_BUNDLE,
      outstandingEvidence: patelRows
        .filter((r) => r.existence !== "served")
        .map((r) => r.label),
      servedEvidence: patelRows.filter((r) => r.existence === "served").map((r) => r.label),
    });
    const vm = buildOverviewWorkspaceVm({
      caseId: "patel-accept",
      chargeLabel: "Affray",
      matterConfidence: { level: "provisional" } as never,
      evidenceRows: patelRows,
      chaseItems: [],
      legalIntelligence: li,
      overviewConsiderations: considerationsForSurface(li, "overview"),
    });

    const outstandingish = vm.issues.filter((i) => i.status === "missing_outstanding");
    for (const issue of outstandingish) {
      expect(issue.title).not.toMatch(/^999 audio outstanding$/i);
      expect(issue.title).not.toMatch(/^BWV (missing|outstanding)$/i);
      expect(issue.title).not.toMatch(/self-defence as established/i);
      expect(issue.summary).not.toMatch(/^999 audio outstanding/i);
    }

    const notEst = vm.issues.filter((i) => i.kind === "not_established");
    for (const issue of notEst) {
      expect(issue.statusLabel).toBe("NOT ESTABLISHED");
      expect(issue.chaseCopy).toBeNull();
      expect(issue.summary.toLowerCase()).toMatch(/do not establish/);
    }

    // Still surfaces case-specific intelligence themes
    const hay = vm.issues.map((i) => `${i.title} ${i.consider ?? ""} ${i.summary}`).join("\n");
    expect(hay).toMatch(/CCTV|master|interview|MG11|custody/i);
  });

  it("cps_chase considerations remain empty (firewall unchanged)", () => {
    const li = buildLegalIntelligence({
      caseId: "firewall",
      allegation: "Affray",
      bundleText: PATEL_SOURCE_BUNDLE,
    });
    expect(considerationsForSurface(li, "cps_chase")).toEqual([]);
  });
});
