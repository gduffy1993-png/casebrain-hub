/**
 * Test snippet showing buildCaseContext diagnostics structure
 * 
 * This file is for reference only - not part of the build.
 * Shows what diagnostics look like when returned from buildCaseContext.
 */

import type { CaseContext } from "./case-context";

// Example diagnostics output:
const exampleContext: CaseContext = {
  case: {
    id: "123e4567-e89b-12d3-a456-426614174000",
    org_id: "4ecb31cd-312b-4a46-939c-abf8d5c7043e",
    title: "Test Case",
    practice_area: "criminal",
  },
  orgScope: {
    orgIdResolved: "4ecb31cd-312b-4a46-939c-abf8d5c7043e",
    method: "org_uuid",
  },
  documents: [
    {
      id: "doc-1",
      name: "test.pdf",
      created_at: "2024-01-01T00:00:00Z",
      raw_text: "Some text content...",
      extracted_json: { parties: [], dates: [] },
    },
  ],
  diagnostics: {
    docCount: 1,
    rawCharsTotal: 5000,
    jsonCharsTotal: 2000,
    suspectedScanned: false,
    avgRawCharsPerDoc: 5000,
    reasonCodes: ["OK"], // Empty if everything is OK
  },
};

// Example with scanned PDF:
const scannedContext: CaseContext = {
  case: {
    id: "123e4567-e89b-12d3-a456-426614174000",
    org_id: "4ecb31cd-312b-4a46-939c-abf8d5c7043e",
    title: "Test Case",
    practice_area: "criminal",
  },
  orgScope: {
    orgIdResolved: "4ecb31cd-312b-4a46-939c-abf8d5c7043e",
    method: "org_uuid",
  },
  documents: [
    {
      id: "doc-1",
      name: "scanned.pdf",
      created_at: "2024-01-01T00:00:00Z",
      raw_text: "", // Empty or very short
      extracted_json: null,
    },
  ],
  diagnostics: {
    docCount: 1,
    rawCharsTotal: 50, // Very low
    jsonCharsTotal: 0,
    suspectedScanned: true, // Flagged as scanned
    avgRawCharsPerDoc: 50,
    reasonCodes: ["SCANNED_SUSPECTED"], // Reason code set
  },
  banner: {
    severity: "warning",
    title: "No extractable text detected",
    message: "This PDF appears scanned/image-only. Upload a text-based PDF or run OCR, then re-analyse.",
  },
};

// Example with no case found:
const notFoundContext: CaseContext = {
  case: null,
  orgScope: {
    orgIdResolved: "solo-user_user_123",
    method: "solo_fallback",
  },
  documents: [],
  diagnostics: {
    docCount: 0,
    rawCharsTotal: 0,
    jsonCharsTotal: 0,
    suspectedScanned: false,
    avgRawCharsPerDoc: 0,
    reasonCodes: ["CASE_NOT_FOUND"], // Reason code set
  },
  banner: {
    severity: "error",
    title: "Case not found",
    message: "Case not found for your org scope. This may be due to an org_id mismatch. Re-upload or contact support.",
  },
};

export { exampleContext, scannedContext, notFoundContext };

