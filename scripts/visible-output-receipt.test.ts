import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildDemoAttentionItems } from "../components/criminal/demo-shell/demoOverviewAdapter";
import type { DisclosureChaseItem } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import {
  buildVisibleOutputReceipt,
  receiptFromChaseItem,
  receiptFromClientFactLine,
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
