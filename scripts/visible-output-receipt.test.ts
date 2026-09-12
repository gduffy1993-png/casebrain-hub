import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildDemoAttentionItems } from "../components/criminal/demo-shell/demoOverviewAdapter";
import {
  buildDisclosureChaseBrief,
  type DisclosureChaseItem,
} from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildBundleTruthLedger } from "../lib/criminal/bundle-truth-ledger";
import {
  buildVisibleOutputReceipt,
  receiptFromChaseItem,
  receiptFromClientFactLine,
  receiptFromClientLineSources,
  receiptFromCourtLine,
  receiptFromMaterialRow,
} from "../lib/criminal/visible-output-receipt";

const chase = (
  partial: Partial<DisclosureChaseItem> & Pick<DisclosureChaseItem, "id" | "label" | "baseStatus">,
): DisclosureChaseItem => ({
  familyId: "interview",
  whyItMatters: "Generated review sentence that must not become a fake File quote.",
  source: "MG6C unused schedule",
  urgency: "high",
  deadlineLabel: "Chase",
  evidenceAnchor: null,
  linkedRoute: null,
  draftChaseWording: "Please provide the material.",
  courtLine: "Position remains provisional.",
  mergedFrom: [],
  ...partial,
});

const requiredFields = [
  "output",
  "outputType",
  "surface",
  "truthState",
  "sourceClass",
  "sourceDocument",
  "sourceRef",
  "sourcePage",
  "transformation",
  "confidence",
  "guard",
] as const;

function expectVisibleReceiptShape(receipt: ReturnType<typeof buildVisibleOutputReceipt>) {
  for (const field of requiredFields) {
    expect(receipt[field], field).toBeTruthy();
  }
  expect(["page unavailable", receipt.sourcePage].includes(receipt.sourcePage)).toBe(true);
  expect(["ref unavailable", receipt.sourceRef].includes(receipt.sourceRef) || receipt.sourceRef.length > 0).toBe(
    true,
  );
}

describe("visible output receipts", () => {
  it("exposes a supported schedule-backed missing receipt with File quote and honest page", () => {
    const receipt = receiptFromChaseItem(
      chase({
        id: "sched",
        label: "Full interview recording outstanding",
        baseStatus: "Outstanding",
        sourceScheduleRef: "O03",
        evidenceAnchor: "O03 | Interview recording | Not yet served",
        provenance: {
          sourceDocumentTitle: "MG6C unused schedule",
          sourceDocumentType: "mg6c",
          sourcePage: null,
          compiledPage: null,
          pageIdentityKnown: false,
          evidenceState: "missing",
          defendant: null,
          countNumber: null,
          unresolvedConflictOrLimitation: "exact page unavailable (unsplit whole-document text)",
        },
      }),
      "chase",
    );
    expectVisibleReceiptShape(receipt);
    expect(receipt.sourceClass).toBe("direct_pdf_quote");
    expect(receipt.sourceRef).toBe("O03");
    expect(receipt.sourcePage).toBe("page unavailable");
    expect(receipt.supportingText).toMatch(/O03 \| Interview recording/);
    expect(receipt.transformation).toMatch(/schedule row → missing chase card/);
    expect(receipt.unsupportedWarning).toBeNull();
  });

  it("exposes a derived/absence receipt without inventing a page or ref", () => {
    const receipt = buildVisibleOutputReceipt({
      output: "999 audio remains outstanding on the current papers",
      surface: "overview",
      status: "Outstanding",
      excerpt: "No listing of original 999 audio in the unused material.",
    });
    expectVisibleReceiptShape(receipt);
    expect(receipt.sourceClass).toBe("derived_from_absence");
    expect(receipt.sourceRef).toBe("ref unavailable");
    expect(receipt.sourcePage).toBe("page unavailable");
    expect(receipt.supportingText).toMatch(/No listing of original 999 audio/);
    expect(receipt.transformation).toBe("absence rule");
    expect(receipt.unsupportedWarning).toBeNull();
  });

  it("classes a no-named-material court line as derived from absence, not unsupported outstanding", () => {
    const receipt = receiptFromCourtLine(
      "No named outstanding material on the current papers — position stays provisional.",
    );
    expect(receipt.sourceClass).toBe("derived_from_absence");
    expect(receipt.truthState).toBe("none");
    expect(receipt.sourceRef).toBe("ref unavailable");
    expect(receipt.sourcePage).toBe("page unavailable");
    expect(receipt.guard).toMatch(/derived from stated absence/);
    expect(receipt.unsupportedWarning).toBeNull();
  });

  it("classes a no-CCTV court line with a File quote as derived absence, not unsupported", () => {
    const receipt = receiptFromCourtLine(
      "The file indicates no CCTV is available — confirm in writing that none exists; absence may shift weight onto witness account quality and consistency.",
      [
        {
          label: "The file indicates no CCTV is available",
          baseStatus: "Not safely confirmed",
          source: "File extract",
          evidenceAnchor: "Sensitivities: no direct identification; no CCTV of scene; full fire cause report.",
        },
      ],
    );
    expect(receipt.sourceClass).toBe("derived_from_absence");
    expect(receipt.truthState).toBe("not_safely_confirmed");
    expect(receipt.sourceRef).toBe("ref unavailable");
    expect(receipt.supportingText).toMatch(/no CCTV of scene/);
    expect(receipt.guard).toMatch(/derived from stated absence/);
    expect(receipt.unsupportedWarning).toBeNull();
  });

  it("classes provisional solicitor caution lines as procedural, not unsupported served facts", () => {
    const receipt = receiptFromCourtLine(
      "Custody/PACE safeguards cannot be finally assessed until the full custody and interview material is served.",
    );
    expect(receipt.sourceClass).toBe("procedural_instruction");
    expect(receipt.truthState).toBe("provisional");
    expect(receipt.sourceRef).toBe("ref unavailable");
    expect(receipt.sourcePage).toBe("page unavailable");
    expect(receipt.guard).toMatch(/procedural/);
    expect(receipt.unsupportedWarning).toBeNull();
  });

  it("exposes an unsupported receipt when no File quote or ref exists", () => {
    const receipt = buildVisibleOutputReceipt({
      output: "Defence has a strong alibi on the papers",
      surface: "overview",
      status: "Outstanding",
    });
    expectVisibleReceiptShape(receipt);
    expect(receipt.sourceClass).toBe("unsupported");
    expect(receipt.sourceRef).toBe("ref unavailable");
    expect(receipt.sourcePage).toBe("page unavailable");
    expect(receipt.supportingText).toBeNull();
    expect(receipt.unsupportedWarning).toMatch(/Unsupported/);
    expect(receipt.guard).toMatch(/no supporting File\/PDF/);
  });

  it("keeps interview summary served split from transcript missing", () => {
    const receipt = receiptFromChaseItem(
      chase({
        id: "split-interview",
        label: "Full interview recording / transcript outstanding",
        baseStatus: "Outstanding",
        sourceScheduleRef: "MG15/02",
        evidenceAnchor: "Interview summary served. Full recording/transcript not yet included.",
      }),
      "chase",
    );
    expectVisibleReceiptShape(receipt);
    expect(receipt.family).toBe("interview_full");
    expect(receipt.transformation).toBe("served summary split from missing transcript");
    expect(receipt.supportingText).toMatch(/Interview summary served/);
    expect(receipt.sourceRef).toBe("MG15/02");
  });

  it("keeps CCTV stills served split from master missing", () => {
    const receipt = receiptFromMaterialRow({
      label: "CCTV master / full window outstanding",
      status: "outstanding",
      scheduleRef: "EX-MUR-011",
      displayLine: "CCTV stills and timing note served. Master footage outstanding.",
      sourceAnchor: {
        excerpt: "CCTV stills and timing note served. Master footage outstanding.",
        sectionLabel: "MG6C unused",
      },
    });
    expectVisibleReceiptShape(receipt);
    expect(receipt.family).toBe("cctv_master");
    expect(receipt.transformation).toBe("served stills split from missing master");
    expect(receipt.surface).toBe("papers");
  });

  it("keeps page-aware PDF provenance on Papers receipts", () => {
    const ledger = buildBundleTruthLedger({
      bundleText: [
        "=== Davies unused material schedule.pdf ===",
        "[p.7 / compiled p.42]",
        "MG6/04 bank source statements Outstanding Not in papers supplied",
      ].join("\n"),
    });
    const row = ledger.materials.find((material) => material.scheduleRef === "MG6/04");
    expect(row).toBeTruthy();
    expect(row?.sourceAnchor.sourceDocumentTitle).toBe("Davies unused material schedule.pdf");
    expect(row?.sourceAnchor.sourcePage).toBe("p.7");
    expect(row?.sourceAnchor.compiledPage).toBe("p.42");

    const receipt = receiptFromMaterialRow(row!);
    expectVisibleReceiptShape(receipt);
    expect(receipt.sourceDocument).toBe("Davies unused material schedule.pdf");
    expect(receipt.sourcePage).toBe("p.7 (compiled p.42)");
    expect(receipt.supportingText).toMatch(/Outstanding Not in papers supplied/);
  });

  it("keeps page-aware PDF provenance when a schedule row becomes an Overview chase card", () => {
    const bundleText = [
      "=== Davies unused material schedule.pdf ===",
      "[p.7 / compiled p.42]",
      "MG6/04 bank source statements Outstanding Not in papers supplied",
    ].join("\n");
    const brief = buildDisclosureChaseBrief({
      caseId: "receipt-page-test",
      caseTitle: "R v Davies",
      clientLabel: "Davies",
      allegation: "Fraud",
      stage: "First appearance",
      hearingStatus: "Upcoming listing",
      hearingDateIso: null,
      bundleHealth: "Review papers",
      positionStatus: "Position not safely recorded yet",
      battleboard: null,
      snapshotMissing: [],
      proceduralOutstanding: [],
      bundleText,
    });
    const item = brief.items.find((candidate) => candidate.sourceScheduleRef === "MG6/04");
    expect(item).toBeTruthy();
    expect(item?.provenance?.sourceDocumentTitle).toBe("Davies unused material schedule.pdf");
    expect(item?.provenance?.sourcePage).toBe("p.7");
    expect(item?.provenance?.compiledPage).toBe("p.42");

    const receipt = receiptFromChaseItem(item!, "overview");
    expect(receipt.sourcePage).toBe("p.7 (compiled p.42)");
    expect(receipt.sourceDocument).toBe("Davies unused material schedule.pdf");
  });

  it("backs a multi-item court line with child receipts for every named item", () => {
    const receipt = receiptFromCourtLine(
      "The defence asks the court to record that MG6/05 CCTV Continuity log and MG6/04 bank source statements remain outstanding on the papers.",
      [
        chase({
          id: "cctv",
          label: "MG6/05 CCTV Continuity log",
          baseStatus: "Outstanding",
          sourceScheduleRef: "MG6/05",
          evidenceAnchor: "MG6/05 CCTV Continuity log — Outstanding Awaiting export",
        }),
        chase({
          id: "bank",
          label: "MG6/04 bank source statements",
          baseStatus: "Outstanding",
          sourceScheduleRef: "MG6/04",
          evidenceAnchor: "MG6/04 bank source statements — Outstanding Not in papers supplied",
        }),
      ],
    );
    expect(receipt.sourceClass).toBe("multi_source_backed");
    expect(receipt.sourceRef).toBe("MG6/05, MG6/04");
    expect(receipt.childReceipts).toHaveLength(2);
    expect(receipt.childReceipts?.map((child) => child.supportingText)).toEqual([
      "MG6/05 CCTV Continuity log — Outstanding Awaiting export",
      "MG6/04 bank source statements — Outstanding Not in papers supplied",
    ]);
    expect(receipt.guard).toMatch(/multi-item line backed/);
  });

  it("backs a multi-item client update with child receipts from the shortlist", () => {
    const receipt = receiptFromClientLineSources(
      "We are reviewing the papers and some evidence is still outstanding.",
      [
        chase({
          id: "cctv",
          label: "CCTV master footage",
          baseStatus: "Outstanding",
          sourceScheduleRef: "EX-MUR-009",
          evidenceAnchor: "EX-MUR-009 — CCTV stills and timing note Master footage — outstanding",
        }),
        chase({
          id: "cad",
          label: "CAD and 999 summaries Original audio/log",
          baseStatus: "Outstanding",
          sourceScheduleRef: "EX-MUR-012",
          evidenceAnchor: "EX-MUR-012 — CAD and 999 summaries Original audio/log — outstanding",
        }),
      ],
    );
    expect(receipt.surface).toBe("client");
    expect(receipt.outputType).toBe("client_summary");
    expect(receipt.sourceClass).toBe("multi_source_backed");
    expect(receipt.sourceRef).toContain("EX-MUR-009");
    expect(receipt.sourceRef).toContain("EX-MUR-012");
    expect(receipt.supportingText).toMatch(/CCTV stills/);
    expect(receipt.supportingText).toMatch(/CAD and 999/);
    expect(receipt.unsupportedWarning).toBeNull();
    expect(receipt.childReceipts).toHaveLength(2);
  });

  it("treats standard provisional client-safe summary wording as procedural, not unsupported", () => {
    const receipt = buildVisibleOutputReceipt({
      output:
        "CLIENT-SAFE SUMMARY (not for court or CPS) We are reviewing the papers in your case. This is early-stage — nothing is final until we have full disclosure and your instructions. We are not saying the case is won or lost — we need the full material before giving firm advice.",
      surface: "client",
      outputType: "client_summary",
    });

    expect(receipt.sourceClass).toBe("procedural_instruction");
    expect(receipt.truthState).toBe("provisional");
    expect(receipt.unsupportedWarning).toBeNull();
    expect(receipt.guard).toMatch(/procedural/);
  });

  it("does not turn why-it-matters copy into a fake File quote", () => {
    const receipt = receiptFromChaseItem(
      chase({
        id: "no-fake-quote",
        label: "Defence has a strong alibi on the papers",
        baseStatus: "Outstanding",
        whyItMatters: "Generated review sentence that must not become a fake File quote.",
        evidenceAnchor: null,
        source: "Crown / disclosure officer",
      }),
    );
    expect(receipt.supportingText).toBeNull();
    expect(receipt.sourceClass).toBe("unsupported");
  });

  it("never invents a page number when page identity is unknown", () => {
    const receipt = buildVisibleOutputReceipt({
      output: "Charge sheet extract",
      surface: "papers",
      scheduleRef: "EX-MUR-001",
      excerpt: "EX-MUR-001 Charge sheet extract served",
      provenance: {
        sourceDocumentTitle: "Unused schedule",
        sourceDocumentType: "mg6c",
        sourcePage: "1",
        compiledPage: "1",
        pageIdentityKnown: false,
        evidenceState: "served",
        defendant: null,
        countNumber: null,
        unresolvedConflictOrLimitation: null,
      },
    });
    expect(receipt.sourcePage).toBe("page unavailable");
    expect(receipt.supportingText).toMatch(/Charge sheet extract/);
  });

  it("attaches a visible receipt to Overview attention items", () => {
    const attention = buildDemoAttentionItems([
      chase({
        id: "ov",
        label: "Full interview recording outstanding",
        baseStatus: "Outstanding",
        sourceScheduleRef: "O03",
        evidenceAnchor: "O03 | Interview recording | Not yet served",
      }),
    ]);
    expect(attention).toHaveLength(1);
    expectVisibleReceiptShape(attention[0].receipt);
    expect(attention[0].receipt.surface).toBe("overview");
    expect(attention[0].receipt.sourceRef).toBe("O03");
  });

  it("builds a client factual-line receipt from the packet row, not invented text", () => {
    const receipt = receiptFromClientFactLine("Interview summary — on the papers.", {
      status: "served",
      scheduleRef: "MG15/01",
      displayLine: "MG15/01 Interview summary served",
      excerpt: "MG15/01 Interview summary served",
    });
    expect(receipt.surface).toBe("client");
    expect(receipt.sourceClass).toBe("direct_pdf_quote");
    expect(receipt.sourceRef).toBe("MG15/01");
    expect(receipt.supportingText).toMatch(/Interview summary served/);
  });

  it("wires a Why / source receipt affordance on solicitor surfaces", () => {
    const disclosure = readFileSync(
      resolve(process.cwd(), "components/criminal/trust/OutputReceiptDisclosure.tsx"),
      "utf8",
    );
    expect(disclosure).toMatch(/Why \/ source receipt/);
    expect(disclosure).toMatch(/data-testid=\{testId\}/);
    const files = [
      "components/criminal/disclosure-chase/DisclosureChase.tsx",
      "components/criminal/demo-shell/DemoOverviewCanvas.tsx",
      "components/criminal/papers/PapersDocInventoryPanel.tsx",
      "components/criminal/workflow/PilotSummaryView.tsx",
      "components/criminal/workflow/PilotTodayDashboard.tsx",
    ];
    for (const file of files) {
      const src = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(src, file).toMatch(/OutputReceiptDisclosure/);
    }
  });
});
