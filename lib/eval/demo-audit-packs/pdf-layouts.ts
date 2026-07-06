import type { PdfPageLayoutSpec } from "./pdf-layout";

export const PHONE_HARASSMENT_LAYOUT: PdfPageLayoutSpec[] = [
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
];

export const CCTV_THEFT_LAYOUT: PdfPageLayoutSpec[] = [
  { pageNumber: 1, label: "Cover and charge", sections: [{ name: "COVER_INDEX" }, { name: "CHARGE" }], includeBundleHeader: true },
  { pageNumber: 2, label: "MG5 (1/2)", sections: [{ name: "MG5", part: 0, parts: 2 }] },
  { pageNumber: 3, label: "MG5 (2/2)", sections: [{ name: "MG5", part: 1, parts: 2 }] },
  { pageNumber: 4, label: "MG6C schedule", sections: [{ name: "MG6" }] },
  { pageNumber: 5, label: "Officer MG11", sections: [{ name: "MG11" }] },
  { pageNumber: 6, label: "CCTV stills (1/2)", sections: [{ name: "CCTV_STILLS", part: 0, parts: 2 }] },
  { pageNumber: 7, label: "CCTV stills (2/2)", sections: [{ name: "CCTV_STILLS", part: 1, parts: 2 }] },
  { pageNumber: 8, label: "Exhibit list", sections: [{ name: "EXHIBIT_LIST" }] },
  { pageNumber: 9, label: "Listing", sections: [{ name: "LISTING" }] },
];

export const BWV_ASSAULT_LAYOUT: PdfPageLayoutSpec[] = [
  { pageNumber: 1, label: "Cover and charge", sections: [{ name: "COVER_INDEX" }, { name: "CHARGE" }], includeBundleHeader: true },
  { pageNumber: 2, label: "MG5 (1/2)", sections: [{ name: "MG5", part: 0, parts: 2 }] },
  { pageNumber: 3, label: "MG5 (2/2)", sections: [{ name: "MG5", part: 1, parts: 2 }] },
  { pageNumber: 4, label: "MG6C schedule", sections: [{ name: "MG6" }] },
  { pageNumber: 5, label: "Officer MG11", sections: [{ name: "MG11" }] },
  { pageNumber: 6, label: "Custody record extract", sections: [{ name: "CUSTODY" }] },
  { pageNumber: 7, label: "BWV reference / listing", sections: [{ name: "LISTING" }] },
];

export const CO_DEF_BURGLARY_LAYOUT: PdfPageLayoutSpec[] = [
  { pageNumber: 1, label: "Cover and charge", sections: [{ name: "COVER_INDEX" }, { name: "CHARGE" }], includeBundleHeader: true },
  { pageNumber: 2, label: "MG5 (1/2)", sections: [{ name: "MG5", part: 0, parts: 2 }] },
  { pageNumber: 3, label: "MG5 (2/2)", sections: [{ name: "MG5", part: 1, parts: 2 }] },
  { pageNumber: 4, label: "MG6C schedule", sections: [{ name: "MG6" }] },
  { pageNumber: 5, label: "Officer statement", sections: [{ name: "OFFICER_STMT" }] },
  { pageNumber: 6, label: "Co-defendant interview summary", sections: [{ name: "CO_DEF_INTERVIEW" }] },
  { pageNumber: 7, label: "Exhibit list", sections: [{ name: "EXHIBIT_LIST" }] },
  { pageNumber: 8, label: "Listing", sections: [{ name: "LISTING" }] },
];

export const ENCRO_DRUGS_LAYOUT: PdfPageLayoutSpec[] = [
  { pageNumber: 1, label: "Cover and charge", sections: [{ name: "COVER_INDEX" }, { name: "CHARGE" }], includeBundleHeader: true },
  { pageNumber: 2, label: "MG5 (1/2)", sections: [{ name: "MG5", part: 0, parts: 2 }] },
  { pageNumber: 3, label: "MG5 (2/2)", sections: [{ name: "MG5", part: 1, parts: 2 }] },
  { pageNumber: 4, label: "MG6C schedule", sections: [{ name: "MG6" }] },
  { pageNumber: 5, label: "Officer statement", sections: [{ name: "OFFICER_STMT" }] },
  { pageNumber: 6, label: "Message extracts (1/2)", sections: [{ name: "MESSAGE_EXTRACTS", part: 0, parts: 2 }] },
  { pageNumber: 7, label: "Message extracts (2/2)", sections: [{ name: "MESSAGE_EXTRACTS", part: 1, parts: 2 }] },
  { pageNumber: 8, label: "Exhibit list", sections: [{ name: "EXHIBIT_LIST" }] },
  { pageNumber: 9, label: "Listing", sections: [{ name: "LISTING" }] },
];

export const FRAUD_BANK_LAYOUT: PdfPageLayoutSpec[] = [
  { pageNumber: 1, label: "Cover and charge", sections: [{ name: "COVER_INDEX" }, { name: "CHARGE" }], includeBundleHeader: true },
  { pageNumber: 2, label: "MG5 (1/2)", sections: [{ name: "MG5", part: 0, parts: 2 }] },
  { pageNumber: 3, label: "MG5 (2/2)", sections: [{ name: "MG5", part: 1, parts: 2 }] },
  { pageNumber: 4, label: "MG6C schedule", sections: [{ name: "MG6" }] },
  { pageNumber: 5, label: "Officer statement", sections: [{ name: "OFFICER_STMT" }] },
  { pageNumber: 6, label: "Bank statement summaries (1/2)", sections: [{ name: "BANK_RECORDS", part: 0, parts: 2 }] },
  { pageNumber: 7, label: "Bank statement summaries (2/2)", sections: [{ name: "BANK_RECORDS", part: 1, parts: 2 }] },
  { pageNumber: 8, label: "Exhibit list", sections: [{ name: "EXHIBIT_LIST" }] },
  { pageNumber: 9, label: "Listing", sections: [{ name: "LISTING" }] },
];

export const MOTORING_SJP_LAYOUT: PdfPageLayoutSpec[] = [
  { pageNumber: 1, label: "Cover and charge", sections: [{ name: "COVER_INDEX" }, { name: "CHARGE" }], includeBundleHeader: true },
  { pageNumber: 2, label: "MG5 (1/2)", sections: [{ name: "MG5", part: 0, parts: 2 }] },
  { pageNumber: 3, label: "MG5 (2/2)", sections: [{ name: "MG5", part: 1, parts: 2 }] },
  { pageNumber: 4, label: "MG6C schedule", sections: [{ name: "MG6" }] },
  { pageNumber: 5, label: "Officer MG11", sections: [{ name: "MG11" }] },
  { pageNumber: 6, label: "Breath/device procedure summary", sections: [{ name: "BREATH_PROCEDURE" }] },
  { pageNumber: 7, label: "Listing", sections: [{ name: "LISTING" }] },
];

export const SEXUAL_ABE_LAYOUT: PdfPageLayoutSpec[] = [
  { pageNumber: 1, label: "Cover and charge", sections: [{ name: "COVER_INDEX" }, { name: "CHARGE" }], includeBundleHeader: true },
  { pageNumber: 2, label: "MG5 (1/2)", sections: [{ name: "MG5", part: 0, parts: 2 }] },
  { pageNumber: 3, label: "MG5 (2/2)", sections: [{ name: "MG5", part: 1, parts: 2 }] },
  { pageNumber: 4, label: "MG6C schedule", sections: [{ name: "MG6" }] },
  { pageNumber: 5, label: "Complainant MG11 (draft)", sections: [{ name: "MG11", part: 0, parts: 2 }] },
  { pageNumber: 6, label: "Complainant MG11 (cont.)", sections: [{ name: "MG11", part: 1, parts: 2 }] },
  { pageNumber: 7, label: "ABE interview note", sections: [{ name: "ABE_NOTE" }] },
  { pageNumber: 8, label: "Exhibit list", sections: [{ name: "EXHIBIT_LIST" }] },
  { pageNumber: 9, label: "Listing", sections: [{ name: "LISTING" }] },
];

export const YOUTH_COURT_LAYOUT: PdfPageLayoutSpec[] = [
  { pageNumber: 1, label: "Cover and charge", sections: [{ name: "COVER_INDEX" }, { name: "CHARGE" }], includeBundleHeader: true },
  { pageNumber: 2, label: "MG5 (1/2)", sections: [{ name: "MG5", part: 0, parts: 2 }] },
  { pageNumber: 3, label: "MG5 (2/2)", sections: [{ name: "MG5", part: 1, parts: 2 }] },
  { pageNumber: 4, label: "MG6C schedule", sections: [{ name: "MG6" }] },
  { pageNumber: 5, label: "Officer statement", sections: [{ name: "OFFICER_STMT" }] },
  { pageNumber: 6, label: "YJS report extract", sections: [{ name: "YJS_REPORT" }] },
  { pageNumber: 7, label: "Appropriate adult note", sections: [{ name: "AA_NOTE" }] },
  { pageNumber: 8, label: "Listing", sections: [{ name: "LISTING" }] },
];
