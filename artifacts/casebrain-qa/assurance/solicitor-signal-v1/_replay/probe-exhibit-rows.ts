/**
 * What the normaliser makes of an exhibit-list row, where the status cell is welded to the
 * description (`EX-MUR-001Charge SheetServed summary/draft`).
 */
import {
  classifyMaterialStatus,
  deglueScheduleText,
  parseScheduleRef,
} from "../../../../../lib/criminal/bundle-material-normalizer";

const rows = [
  "EX-MUR-001Charge SheetServed summary/draft",
  "EX-MUR-002MG5 Case SummaryServed summary/draft",
  "EX-MUR-007Police Officer StatementServed summary/draft",
  "EX-MUR-021Interview SummaryFull recording/transcript outstanding",
  "8Police officer statementBWV not servedEX-MUR-007",
  "2Charge sheet extractServedEX-MUR-001",
];

for (const r of rows) {
  console.log(`RAW    : ${r}`);
  console.log(`DEGLUE : ${deglueScheduleText(r)}`);
  console.log(`REF    : ${parseScheduleRef(r)}`);
  console.log(`STATUS : ${classifyMaterialStatus(r)}`);
  console.log("");
}
