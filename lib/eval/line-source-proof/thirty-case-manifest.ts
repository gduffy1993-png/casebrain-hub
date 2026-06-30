/**
 * Curated 30-case controlled proof-ledger pack (text-only).
 * PDF-backed Jordan runs separately via build-pdf-backed-jordan-proof-case.ts.
 */
export type ThirtyCaseSpec = {
  id: string;
  shape: string;
  category: string;
  dir: string;
};

const CASE_ROOT = "artifacts/evidence-state-audit-local/cases";

export const THIRTY_CASE_MANIFEST: ThirtyCaseSpec[] = [
  { id: "cb-fresh-002-jordan-hale", shape: "BWV referred / custody extract", category: "bwv_custody_pace", dir: `${CASE_ROOT}/cb-fresh-002-jordan-hale` },
  { id: "cb-fresh-001-taylor-brookes", shape: "Phone screenshots / attribution disputed", category: "phone_attribution", dir: `${CASE_ROOT}/cb-fresh-001-taylor-brookes` },
  { id: "sim-380", shape: "CCTV stills vs master / grainy ID", category: "cctv_stills_master", dir: `${CASE_ROOT}/sim-380` },
  { id: "sim-389", shape: "Encro handle vs defendant / co-def segregation", category: "encro_handle_codef", dir: `${CASE_ROOT}/sim-389` },
  { id: "sim-394", shape: "Historic sexual / pages out of order", category: "historic_sexual_abe", dir: `${CASE_ROOT}/sim-394` },
  { id: "motoring-thin-ella-shaw", shape: "Motoring thin bundle / SJP", category: "motoring_sjp", dir: `${CASE_ROOT}/motoring-thin-ella-shaw` },
  { id: "gbh-pike-jordan-pike", shape: "GBH multi-handed / participation", category: "multi_handed_assault", dir: `${CASE_ROOT}/gbh-pike-jordan-pike` },
  { id: "crown-court-patterson", shape: "Crown court serious offence", category: "crown_court", dir: `${CASE_ROOT}/crown-court-patterson` },
  { id: "pilot-3-kian-doyle", shape: "PWITS / phone attribution hero", category: "drugs_phone_attribution", dir: `${CASE_ROOT}/pilot-3-kian-doyle` },
  { id: "pilot-3-leon-marsh", shape: "Robbery / identification hero", category: "robbery_id", dir: `${CASE_ROOT}/pilot-3-leon-marsh` },
  { id: "pilot-3-marcus-vale", shape: "Fraud / account control hero", category: "fraud_banking", dir: `${CASE_ROOT}/pilot-3-marcus-vale` },
  { id: "sim-370", shape: "Youth defendant / AA record missing", category: "youth_vulnerability", dir: `${CASE_ROOT}/sim-370` },
  { id: "sim-372", shape: "Domestic / MG6 schedule trap", category: "domestic_harassment", dir: `${CASE_ROOT}/sim-372` },
  { id: "sim-373", shape: "Harassment / MG6 listed-not-served", category: "domestic_harassment", dir: `${CASE_ROOT}/sim-373` },
  { id: "sim-377", shape: "Index lists BWV — file absent", category: "messy_index_layout", dir: `${CASE_ROOT}/sim-377` },
  { id: "sim-381", shape: "Phone screenshots / duplicate pages", category: "phone_attribution", dir: `${CASE_ROOT}/sim-381` },
  { id: "sim-384", shape: "Interview summary / large messy rotated", category: "messy_index_layout", dir: `${CASE_ROOT}/sim-384` },
  { id: "sim-393", shape: "Bad OCR scan / inference as fact", category: "messy_index_layout", dir: `${CASE_ROOT}/sim-393` },
  { id: "sim-352", shape: "County lines / exploitation inferred", category: "county_lines_exploitation", dir: `${CASE_ROOT}/sim-352` },
  { id: "sim-300", shape: "County lines / missing MG6 schedule", category: "county_lines_exploitation", dir: `${CASE_ROOT}/sim-300` },
  { id: "sim-369", shape: "Drug supply / youth custody", category: "drugs_conspiracy_multidef", dir: `${CASE_ROOT}/sim-369` },
  { id: "sim-388", shape: "Encro wrong-person / handle mapping", category: "encro_handle_codef", dir: `${CASE_ROOT}/sim-388` },
  { id: "sim-010", shape: "Fraud by false representation", category: "fraud_banking", dir: `${CASE_ROOT}/sim-010` },
  { id: "sim-396", shape: "Fraud accounts / mixed defendants", category: "fraud_banking", dir: `${CASE_ROOT}/sim-396` },
  { id: "sim-364", shape: "BWV timestamp vs incident / date conflict", category: "bwv_custody_pace", dir: `${CASE_ROOT}/sim-364` },
  { id: "sim-362", shape: "Schedule trap / pages out of order", category: "messy_index_layout", dir: `${CASE_ROOT}/sim-362` },
  { id: "sim-347", shape: "Large messy bundle / rotated", category: "messy_index_layout", dir: `${CASE_ROOT}/sim-347` },
  { id: "fictional-theft-ashleigh-merritt", shape: "Theft provisional / thin bundle", category: "generic_provisional", dir: `${CASE_ROOT}/fictional-theft-ashleigh-merritt` },
  { id: "s18-charge-reduction-jordan-clarke", shape: "S18 charge reduction / medical intent", category: "multi_handed_assault", dir: `${CASE_ROOT}/s18-charge-reduction-jordan-clarke` },
  { id: "sim-392", shape: "Domestic ABH / vulnerability", category: "domestic_harassment", dir: `${CASE_ROOT}/sim-392` },
];
