import type { PdfPageLayoutSpec } from "./pdf-layout";

export type DemoAuditCaseSpec = {
  id: string;
  title: string;
  shape: string;
  defendant: string;
  pdfLayout: PdfPageLayoutSpec[];
};

export const DEMO_AUDIT_FIVE_CASES: DemoAuditCaseSpec[] = [
  {
    id: "demo-audit-01-phone-harassment",
    title: "DA-01 Riley Moss — phone harassment / screenshots served",
    shape: "Phone screenshots served / extraction summary / full download missing",
    defendant: "Riley Moss",
    pdfLayout: [
      { pageNumber: 1, label: "Cover and charge", sections: [{ name: "COVER_INDEX" }, { name: "CHARGE" }], includeBundleHeader: true },
      { pageNumber: 2, label: "MG5 (1/2)", sections: [{ name: "MG5", part: 0, parts: 2 }] },
      { pageNumber: 3, label: "MG5 (2/2)", sections: [{ name: "MG5", part: 1, parts: 2 }] },
      { pageNumber: 4, label: "MG6C schedule", sections: [{ name: "MG6" }] },
      { pageNumber: 5, label: "MG11 complainant (draft)", sections: [{ name: "MG11", part: 0, parts: 2 }] },
      { pageNumber: 6, label: "MG11 complainant (cont.)", sections: [{ name: "MG11", part: 1, parts: 2 }] },
      { pageNumber: 7, label: "Screenshot/message pack (1/2)", sections: [{ name: "SCREENSHOTS", part: 0, parts: 2 }] },
      { pageNumber: 8, label: "Screenshot/message pack (2/2)", sections: [{ name: "SCREENSHOTS", part: 1, parts: 2 }] },
      { pageNumber: 9, label: "Exhibit list", sections: [{ name: "EXHIBIT_LIST" }] },
      { pageNumber: 10, label: "Police note — attribution", sections: [{ name: "POLICE_NOTE" }] },
      { pageNumber: 11, label: "Listing", sections: [{ name: "LISTING" }] },
    ],
  },
  {
    id: "demo-audit-02-cctv-stills",
    title: "DA-02 Devon Walsh — CCTV stills served / master footage missing",
    shape: "CCTV stills served / master export and continuity outstanding",
    defendant: "Devon Walsh",
    pdfLayout: [
      { pageNumber: 1, label: "Cover and charge", sections: [{ name: "COVER_INDEX" }, { name: "CHARGE" }], includeBundleHeader: true },
      { pageNumber: 2, label: "MG5 (1/2)", sections: [{ name: "MG5", part: 0, parts: 2 }] },
      { pageNumber: 3, label: "MG5 (2/2)", sections: [{ name: "MG5", part: 1, parts: 2 }] },
      { pageNumber: 4, label: "MG6C schedule", sections: [{ name: "MG6" }] },
      { pageNumber: 5, label: "Officer MG11", sections: [{ name: "MG11" }] },
      { pageNumber: 6, label: "CCTV stills (1/2)", sections: [{ name: "CCTV_STILLS", part: 0, parts: 2 }] },
      { pageNumber: 7, label: "CCTV stills (2/2)", sections: [{ name: "CCTV_STILLS", part: 1, parts: 2 }] },
      { pageNumber: 8, label: "Exhibit list", sections: [{ name: "EXHIBIT_LIST" }] },
      { pageNumber: 9, label: "Listing", sections: [{ name: "LISTING" }] },
    ],
  },
  {
    id: "demo-audit-03-bwv-custody",
    title: "DA-03 Casey Fry — BWV referred / custody extract only",
    shape: "BWV referred / custody extract incomplete / interview outstanding",
    defendant: "Casey Fry",
    pdfLayout: [
      { pageNumber: 1, label: "Cover and charge", sections: [{ name: "COVER_INDEX" }, { name: "CHARGE" }], includeBundleHeader: true },
      { pageNumber: 2, label: "MG5 (1/2)", sections: [{ name: "MG5", part: 0, parts: 2 }] },
      { pageNumber: 3, label: "MG5 (2/2)", sections: [{ name: "MG5", part: 1, parts: 2 }] },
      { pageNumber: 4, label: "MG6C schedule", sections: [{ name: "MG6" }] },
      { pageNumber: 5, label: "Officer MG11", sections: [{ name: "MG11" }] },
      { pageNumber: 6, label: "Custody record extract", sections: [{ name: "CUSTODY" }] },
      { pageNumber: 7, label: "BWV reference / listing", sections: [{ name: "LISTING" }] },
    ],
  },
  {
    id: "demo-audit-04-co-def-interview",
    title: "DA-04 Morgan Reid — co-defendant interview served / target interview missing",
    shape: "Co-def interview other_defendant_only / target defendant interview outstanding",
    defendant: "Morgan Reid",
    pdfLayout: [
      { pageNumber: 1, label: "Cover and charge", sections: [{ name: "COVER_INDEX" }, { name: "CHARGE" }], includeBundleHeader: true },
      { pageNumber: 2, label: "MG5 (1/2)", sections: [{ name: "MG5", part: 0, parts: 2 }] },
      { pageNumber: 3, label: "MG5 (2/2)", sections: [{ name: "MG5", part: 1, parts: 2 }] },
      { pageNumber: 4, label: "MG6C schedule", sections: [{ name: "MG6" }] },
      { pageNumber: 5, label: "Officer statement", sections: [{ name: "OFFICER_STMT" }] },
      { pageNumber: 6, label: "Co-defendant interview summary", sections: [{ name: "CO_DEF_INTERVIEW" }] },
      { pageNumber: 7, label: "Exhibit list", sections: [{ name: "EXHIBIT_LIST" }] },
      { pageNumber: 8, label: "Listing", sections: [{ name: "LISTING" }] },
    ],
  },
  {
    id: "demo-audit-05-encro-attribution",
    title: "DA-05 Liam Craft — Encro / county-lines attribution gap",
    shape: "Message extracts served / handle attribution not proved / platform extraction missing",
    defendant: "Liam Craft",
    pdfLayout: [
      { pageNumber: 1, label: "Cover and charge", sections: [{ name: "COVER_INDEX" }, { name: "CHARGE" }], includeBundleHeader: true },
      { pageNumber: 2, label: "MG5 (1/2)", sections: [{ name: "MG5", part: 0, parts: 2 }] },
      { pageNumber: 3, label: "MG5 (2/2)", sections: [{ name: "MG5", part: 1, parts: 2 }] },
      { pageNumber: 4, label: "MG6C schedule", sections: [{ name: "MG6" }] },
      { pageNumber: 5, label: "Officer statement", sections: [{ name: "OFFICER_STMT" }] },
      { pageNumber: 6, label: "Message extracts (1/2)", sections: [{ name: "MESSAGE_EXTRACTS", part: 0, parts: 2 }] },
      { pageNumber: 7, label: "Message extracts (2/2)", sections: [{ name: "MESSAGE_EXTRACTS", part: 1, parts: 2 }] },
      { pageNumber: 8, label: "Exhibit list", sections: [{ name: "EXHIBIT_LIST" }] },
      { pageNumber: 9, label: "Listing", sections: [{ name: "LISTING" }] },
    ],
  },
];

export function caseDirForId(caseId: string): string {
  return `artifacts/evidence-state-audit-local/cases/${caseId}`;
}
