/**
 * Generate a Defence Review & Disclosure Stress-Test PDF
 * 
 * This document is NOT a defence statement, NOT a plea, and NOT a denial.
 * It is a procedural-first, evidence-anchored defence review designed to test
 * prosecution robustness and activate defence leverage.
 * 
 * Run with: npx ts-node scripts/generate-defence-review-pdf.ts
 */

import PDFDocument from "pdfkit";
import * as fs from "fs";
import * as path from "path";

// Case details (matching the prosecution bundle)
const CASE_REF = "T2024/12345";
const DEFENDANT_NAME = "JAMES MICHAEL THOMPSON";
const DEFENDANT_DOB = "15/03/1992";
const DEFENDANT_ADDRESS = "42 Elm Road, Manchester, M15 6PQ";
const ORIGINATING_COURT = "Manchester Magistrates' Court";
const SEISED_COURT = "Manchester Crown Court";
const CHARGE = "Wounding with intent, contrary to section 18 of the Offences Against the Person Act 1861";
const COMPLAINANT = "AHMED HASSAN";
const INCIDENT_DATE = "14/11/2024";

// Output file
const outputDir = path.join(__dirname, "../test-documents");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
const outputFile = path.join(outputDir, "defence-review-disclosure-assessment.pdf");

console.log("Generating Defence Review & Disclosure Assessment PDF...");
console.log(`Output: ${outputFile}`);

// Create PDF
const doc = new PDFDocument({
  size: "A4",
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  info: {
    Title: "Defence Review & Disclosure Readiness Assessment",
    Author: "Defence Solicitors",
    Subject: "Crown Court Criminal Proceedings - Disclosure Assessment",
    Creator: "CaseBrain Hub",
  },
});

const stream = fs.createWriteStream(outputFile);
doc.pipe(stream);

// Helper functions
function addHeading(text: string, fontSize: number = 14, bold: boolean = true) {
  doc.fontSize(fontSize);
  doc.font(bold ? "Helvetica-Bold" : "Helvetica");
  doc.text(text, { align: "left" });
  doc.moveDown(0.5);
}

function addParagraph(text: string, fontSize: number = 10, align: "left" | "justify" | "center" = "justify") {
  doc.fontSize(fontSize);
  doc.font("Helvetica");
  doc.text(text, { align, lineGap: 2 });
  doc.moveDown(0.3);
}

function addBoldParagraph(text: string, fontSize: number = 10) {
  doc.fontSize(fontSize);
  doc.font("Helvetica-Bold");
  doc.text(text, { align: "left" });
  doc.moveDown(0.3);
}

function addTable(data: string[][], colWidths?: number[]) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const numCols = data[0].length;
  const defaultColWidth = pageWidth / numCols;
  const widths = colWidths || Array(numCols).fill(defaultColWidth);
  
  let y = doc.y;
  const rowHeight = 25;
  const headerHeight = 30;
  
  data.forEach((row, rowIndex) => {
    const isHeader = rowIndex === 0;
    const height = isHeader ? headerHeight : rowHeight;
    let x = doc.page.margins.left;
    
    // Check if we need a new page
    if (y + height > doc.page.height - doc.page.margins.bottom - rowHeight) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    
    row.forEach((cell, colIndex) => {
      doc.fontSize(isHeader ? 10 : 9);
      doc.font(isHeader ? "Helvetica-Bold" : "Helvetica");
      
      // Draw cell
      if (isHeader) {
        doc.rect(x, y, widths[colIndex], height).fillAndStroke("#E0E0E0", "#000000");
        doc.fillColor("#000000");
      } else {
        doc.rect(x, y, widths[colIndex], height).stroke("#000000");
        doc.fillColor("#000000");
      }
      
      // Add text (wrap if needed)
      const cellText = cell.length > 60 ? cell.substring(0, 57) + "..." : cell;
      doc.text(cellText, x + 5, y + (height / 2 - 6), {
        width: widths[colIndex] - 10,
        height: height - 10,
        align: "left",
        ellipsis: true,
      });
      
      x += widths[colIndex];
    });
    
    y += height;
  });
  
  doc.y = y;
  doc.moveDown(0.5);
}

function newPage() {
  doc.addPage();
}

// ============================================================================
// TITLE PAGE
// ============================================================================
addHeading("DEFENCE REVIEW & DISCLOSURE READINESS ASSESSMENT", 16, true);
addHeading("(Criminal Proceedings – Crown Court)", 12, false);
doc.moveDown(2);

addParagraph("This document is prepared for the purpose of assessing disclosure completeness, identifying outstanding material, and establishing procedural readiness for trial.", 10);
addParagraph("This document does not constitute a defence statement, does not advance a factual account, and does not make admissions. Defence positions are expressly reserved.", 10);
addParagraph(`Prepared: ${new Date().toLocaleDateString("en-GB")}`, 10);

newPage();

// ============================================================================
// SECTION 1: CASE METADATA
// ============================================================================
addHeading("1. CASE METADATA", 14, true);

const caseMetadata = [
  ["Field", "Details"],
  ["Case Reference", CASE_REF],
  ["Originating Court", ORIGINATING_COURT],
  ["Seised Court", SEISED_COURT],
  ["Defendant", DEFENDANT_NAME],
  ["Date of Birth", DEFENDANT_DOB],
  ["Address", DEFENDANT_ADDRESS],
  ["Charge", CHARGE],
  ["Complainant", COMPLAINANT],
  ["Incident Date", INCIDENT_DATE],
  ["Custody Status", "Remanded in custody"],
];
addTable(caseMetadata);

addParagraph(`Proceedings originated in ${ORIGINATING_COURT} and are now before ${SEISED_COURT}.`, 10);

addHeading("Hearing History", 12, true);
const hearingHistory = [
  ["Date", "Court", "Hearing Type", "Outcome"],
  ["15/11/2024", ORIGINATING_COURT, "First Appearance", "Remanded in custody. Case sent to Crown Court."],
  ["18/11/2024", SEISED_COURT, "Plea and Trial Preparation Hearing", "Not guilty plea entered. Trial listed for 15/01/2025."],
  ["08/01/2025", SEISED_COURT, "Pre-Trial Review", "Trial confirmed. All parties ready."],
];
addTable(hearingHistory);

newPage();

// ============================================================================
// SECTION 2: PROCEDURAL STATUS OVERVIEW
// ============================================================================
addHeading("2. PROCEDURAL STATUS OVERVIEW", 14, true);

addHeading("Arrest & Custody", 12, true);
addParagraph("The defendant was arrested on 14/11/2024 at 23:15 at the scene of the alleged incident. The grounds for arrest were stated as suspicion of wounding with intent, contrary to section 18 of the Offences Against the Person Act 1861.");
addParagraph("The defendant was transported to Longsight Police Station and booked into custody at 23:42. Detention was authorised at 23:45.");

addHeading("PACE Compliance", 12, true);
addParagraph("On the basis of the material currently disclosed, PACE compliance appears facially satisfied. The defendant was cautioned at arrest and again before interview. Rights to legal advice were given both verbally and in writing. A solicitor attended and was present throughout the interview.");
addParagraph("However, the defence reserves the right to review the full custody record, all custody reviews, and all PACE documentation to confirm full compliance with Code C and Code D.");

addHeading("Interview Position", 12, true);
addParagraph("The defendant was interviewed under caution on 15/11/2024 in the presence of his solicitor. The interview was audio-visually recorded (Reference: INT-MAN-2024-11-15-0120).");
addParagraph("The defendant made no comment to all questions put to him. This was a proper exercise of his right to silence under PACE Code C.");

addParagraph("PACE compliance appears facially satisfied on current material, subject to review of full custody record and disclosure.", 10);

newPage();

// ============================================================================
// SECTION 3: EVIDENCE MAP (USED MATERIAL)
// ============================================================================
addHeading("3. EVIDENCE MAP (USED MATERIAL)", 14, true);

addParagraph("The following table sets out the material upon which the prosecution intends to rely, together with the current disclosure status of each item:", 10);

const evidenceMap = [
  ["Evidence Type", "Description", "Disclosure Status", "Notes"],
  ["CCTV", "Edited clips from takeaway cameras", "Partially Disclosed", "Full unedited footage outstanding"],
  ["CCTV", "External camera footage", "Partially Disclosed", "Full timeline outstanding"],
  ["Witness Statement", "MG11 - Complainant (Ahmed Hassan)", "Disclosed", "MG11/001"],
  ["Witness Statement", "MG11 - Sarah Mitchell (independent witness)", "Disclosed", "MG11/002"],
  ["Witness Statement", "MG11 - David Chen (takeaway owner)", "Disclosed", "MG11/003"],
  ["Police Statement", "MG11 - PC 1234 James", "Disclosed", "MG11/004"],
  ["Police Statement", "MG11 - PC 5678 Smith", "Disclosed", "MG11/005"],
  ["Forensic Evidence", "Fingerprint analysis report", "Partially Disclosed", "Conclusions disclosed, methodology outstanding"],
  ["Forensic Evidence", "DNA analysis report", "Partially Disclosed", "Conclusions disclosed, methodology outstanding"],
  ["Medical Evidence", "A&E records", "Disclosed", "Injury summary provided"],
  ["Medical Evidence", "Surgical notes", "Disclosed", "Treatment details provided"],
  ["Identification", "VIPER procedure record", "Disclosed", "Process documentation outstanding"],
  ["BWV", "Body worn video - PC James", "Disclosed", "BWV/001, BWV/003"],
  ["BWV", "Body worn video - PC Smith", "Disclosed", "BWV/002"],
  ["PACE", "Custody record", "Disclosed", "Full record provided"],
  ["PACE", "Interview transcript", "Disclosed", "Full transcript provided"],
];
addTable(evidenceMap);

newPage();

// ============================================================================
// SECTION 4: CCTV & MEDIA EVIDENCE REVIEW
// ============================================================================
addHeading("4. CCTV & MEDIA EVIDENCE REVIEW", 14, true);

addHeading("Current Disclosure", 12, true);
addParagraph("The prosecution has disclosed edited clips from the takeaway's CCTV system. The clips show selected portions of the incident from Camera 2 (counter area) and Camera 4 (external).");
addParagraph("The disclosed clips cover the period approximately 22:47:45 to 22:48:35, focusing on the altercation and stabbing incident.");

addHeading("Outstanding Material", 12, true);
addParagraph("The following material is outstanding and required for proper assessment:");
addParagraph("• Full unedited footage from all cameras covering the period 22:30 to 23:10 (pre and post incident context)");
addParagraph("• Continuity logs documenting the recovery, download, and handling of the CCTV footage");
addParagraph("• Download and handling records showing who accessed the footage, when, and whether any compression or re-encoding was applied");
addParagraph("• Technical specifications of the CCTV system, including frame rate, resolution, and time synchronisation method");
addParagraph("• Any gaps in footage and explanations for such gaps");
addParagraph("• Still images extracted from the footage and the methodology used for extraction");

addHeading("Assessment", 12, true);
addParagraph("At present, the defence is unable to assess full context, continuity, or sequencing. The edited clips provide only a partial view of events. Without the full unedited footage, the defence cannot:");

const assessmentPoints = [
  ["Issue", "Reason"],
  ["Assess pre-incident context", "No footage of defendant's approach or entry"],
  ["Assess post-incident context", "No footage of defendant's departure or route"],
  ["Verify continuity", "No handling records to confirm footage integrity"],
  ["Assess timing accuracy", "No time synchronisation documentation"],
  ["Identify gaps or technical issues", "No disclosure of system faults or recording gaps"],
];
addTable(assessmentPoints);

addParagraph("The defence requires full disclosure of all CCTV material and associated documentation before trial readiness can be confirmed.", 10);

newPage();

// ============================================================================
// SECTION 5: IDENTIFICATION EVIDENCE ASSESSMENT
// ============================================================================
addHeading("5. IDENTIFICATION EVIDENCE ASSESSMENT", 14, true);

addHeading("Identification Process", 12, true);
addParagraph("The prosecution relies on identification evidence from multiple sources:");
addParagraph("• A formal VIPER identification procedure conducted on 16/11/2024, in which the complainant selected the defendant from a 12-image array");
addParagraph("• CCTV still images shown to witnesses Sarah Mitchell and David Chen, both of whom confirmed the person shown was the same person they observed");
addParagraph("• Facial recognition analysis conducted on CCTV stills, showing confidence scores of 85-92%");

addHeading("Outstanding Documentation", 12, true);
addParagraph("The following Code D process documentation is outstanding:");
addParagraph("• Full Code D compliance documentation for the VIPER procedure");
addParagraph("• Details of how the still images were selected and shown to witnesses");
addParagraph("• Whether witnesses saw images before the formal identification procedure");
addParagraph("• Whether witnesses discussed identification between themselves");
addParagraph("• Confidence wording used by officers during the identification process");
addParagraph("• Full facial recognition methodology and limitations documentation");

addHeading("Facial Recognition Limitations", 12, true);
addParagraph("The prosecution has disclosed that facial recognition analysis was conducted, with confidence scores of 85-92%. However, the prosecution has also disclosed that:");
addParagraph("• Facial recognition provides investigative support only");
addParagraph("• It is not determinative of identity");
addParagraph("• Confidence scores are not probabilities of guilt");
addParagraph("• No independent expert has validated the matches");
addParagraph("The defence notes that facial recognition technology has known limitations, including potential false positive rates and sensitivity to image quality. Without expert validation, the weight to be attached to this evidence is limited.");

addHeading("Assessment", 12, true);
addParagraph("Identification reliability remains a live issue pending disclosure of process documentation and methodology. The defence requires full Code D compliance documentation and facial recognition methodology before the weight of identification evidence can be properly assessed.", 10);

newPage();

// ============================================================================
// SECTION 6: FORENSIC EVIDENCE – METHODOLOGY GAP
// ============================================================================
addHeading("6. FORENSIC EVIDENCE – METHODOLOGY GAP", 14, true);

addHeading("Disclosed Conclusions", 12, true);
addParagraph("The prosecution has disclosed the following forensic conclusions:");
addParagraph("• Fingerprint analysis: Partial fingerprint on knife handle matches defendant's right index finger (12 matching characteristics)");
addParagraph("• DNA analysis: Blood on knife blade matches complainant (probability < 1 in 1 billion). Blood on defendant's jacket matches complainant (probability < 1 in 1 billion). Defendant's DNA present on knife handle as minor contributor (probability approximately 1 in 10,000).");

addHeading("Outstanding Methodology", 12, true);
addParagraph("The following methodology and quality documentation is outstanding:");
addParagraph("• Full forensic methodology reports detailing the methods used");
addParagraph("• Quality indicators and validation procedures");
addParagraph("• Chain of custody documentation for all exhibits");
addParagraph("• Laboratory accreditation and quality assurance records");
addParagraph("• Expert qualifications and experience");
addParagraph("• Statistical analysis methodology and population databases used");
addParagraph("• For fingerprints: Details of the 12 matching characteristics, quality of the partial print, and comparison methodology");
addParagraph("• For DNA: Extraction methodology, quantification results, amplification details, and statistical analysis methodology");

addHeading("Assessment", 12, true);
addParagraph("Weight cannot be assessed without disclosure of forensic methodology. The conclusions disclosed are of limited value without understanding the methods used, the quality of the evidence, and the reliability of the analysis.", 10);
addParagraph("The defence requires full forensic methodology disclosure before the weight of forensic evidence can be properly assessed.", 10);

newPage();

// ============================================================================
// SECTION 7: MEDICAL EVIDENCE & INTENT DISTINCTION
// ============================================================================
addHeading("7. MEDICAL EVIDENCE & INTENT DISTINCTION", 14, true);

addHeading("Injury Summary", 12, true);
addParagraph("The medical evidence discloses the following injuries:");
addParagraph("• Stab wound to left upper quadrant of abdomen, approximately 2cm in length, penetrating approximately 8cm into the abdomen");
addParagraph("• Injury to small intestine (jejunum), requiring resection of approximately 15cm");
addParagraph("• Significant haemoperitoneum (approximately 1.5 litres of blood in abdominal cavity)");
addParagraph("• Stab wound to left forearm, approximately 3cm in length, through-and-through injury");
addParagraph("• Emergency laparotomy and surgical repair required");
addParagraph("• Hospital stay of 8 days");

addHeading("Intent Distinction", 12, true);
addParagraph("The medical evidence demonstrates the severity of the injuries and the mechanism by which they were caused. However, there is an important distinction between:");
addParagraph("• Injury severity (factual matter - what happened)");
addParagraph("• Mental element (legal matter - what was intended)");

addParagraph("The medical evidence alone cannot determine the specific intent of the person who inflicted the injuries. The assessment of intent (section 18 vs section 20) is a matter for the court to determine based on all the evidence.", 10);

addHeading("Expert Opinion on Intent", 12, true);
addParagraph("No expert opinion addressing specific intent to cause grievous bodily harm has been disclosed. The medical evidence describes the injuries and their mechanism, but does not address the mental element required for section 18 of the Offences Against the Person Act 1861.");
addParagraph("The distinction between section 18 (specific intent) and section 20 (malicious wounding) or section 47 (assault occasioning actual bodily harm) is a matter of legal assessment, not medical opinion.");

newPage();

// ============================================================================
// SECTION 8: ABSENCE & CONTEXTUAL EVIDENCE
// ============================================================================
addHeading("8. ABSENCE & CONTEXTUAL EVIDENCE", 14, true);

addHeading("Investigation Findings", 12, true);
addParagraph("The prosecution has disclosed that the following investigation has been conducted, with the following results:");

const absenceEvidence = [
  ["Category", "Investigation Conducted", "Result"],
  ["Prior Contact", "Mobile phone analysis, social media checks, witness enquiries", "No evidence of prior contact between defendant and complainant"],
  ["Motive Evidence", "Background checks, witness statements, financial records", "No clear motive identified"],
  ["Threats", "Phone records, social media, witness statements", "No evidence of threats made"],
  ["Planning Messages", "Mobile phone data, messaging apps, email", "No evidence of planning or premeditation"],
  ["Prior Surveillance", "CCTV review (7 days prior), witness enquiries", "No evidence defendant had visited takeaway or surveilled complainant"],
  ["Weapon Purchase", "Retail records, online purchases, financial records", "No evidence of recent purchase of knife"],
];
addTable(absenceEvidence);

addHeading("Relevance to Mental Element", 12, true);
addParagraph("The absence of motive evidence, prior contact, threats, or planning does not acquit the defendant. However, the absence of such material may be relevant to mental element assessment.", 10);
addParagraph("Section 18 of the Offences Against the Person Act 1861 requires proof of specific intent to cause grievous bodily harm. The absence of premeditation, planning, or clear motive may be relevant to whether the mental element of the offence is made out, as distinct from recklessness (section 20) or unlawful act (section 47).");

newPage();

// ============================================================================
// SECTION 9: DISCLOSURE STATUS & CPIA COMPLIANCE
// ============================================================================
addHeading("9. DISCLOSURE STATUS & CPIA COMPLIANCE", 14, true);

addHeading("Disclosure Schedules", 12, true);
addParagraph("The prosecution has provided:");
addParagraph("• MG6C (Used Material Schedule) - listing material upon which the prosecution intends to rely");
addParagraph("• MG6D (Unused Material Schedule) - listing unused material meeting the test for disclosure");

addHeading("Outstanding Material", 12, true);
addParagraph("The following material is outstanding and required under the Criminal Procedure and Investigations Act 1996:");

const outstandingMaterial = [
  ["Category", "Material", "Reason"],
  ["CCTV", "Full unedited footage and handling records", "May assist defence - full context and continuity"],
  ["Forensic", "Full methodology and quality documentation", "May assist defence - weight assessment"],
  ["Identification", "Full Code D process documentation", "May assist defence - reliability assessment"],
  ["Facial Recognition", "Full methodology and limitations", "May assist defence - weight assessment"],
  ["Timeline", "Full timeline analysis and witness time estimates", "May assist defence - duration and sequence"],
  ["Absence Evidence", "Full investigation records", "May assist defence - intent arguments"],
];
addTable(outstandingMaterial);

addHeading("CPIA Compliance", 12, true);
addParagraph("The prosecution has a continuing duty of disclosure under section 7A of the CPIA 1996. The defence acknowledges receipt of the initial disclosure schedules but notes that disclosure remains live.");
addParagraph("The defence is not trial-ready pending completion of disclosure obligations. Further disclosure requests may be made as the case develops and as outstanding material is reviewed.", 10);

newPage();

// ============================================================================
// SECTION 10: PROVISIONAL DEFENCE POSITION
// ============================================================================
addHeading("10. PROVISIONAL DEFENCE POSITION", 14, true);

addHeading("Current Position", 12, true);
addParagraph("At this stage, no factual account is advanced. No admissions are made. Defence positions are expressly reserved.");
addParagraph("Any defence narrative would be speculative at this stage and is therefore not responsibly advanced.", 10);

addHeading("Reservation of Position", 12, true);
addParagraph("The defence reserves its full position pending:");
addParagraph("• Completion of disclosure");
addParagraph("• Review of all unused material");
addParagraph("• Expert evidence considerations (if required)");
addParagraph("• Full analysis of all evidence");
addParagraph("• Consideration of all procedural matters");

addHeading("Right to Silence", 12, true);
addParagraph("The defendant exercised his right to silence during interview. This was a proper exercise of his rights under PACE Code C. The defence position remains reserved and will be developed following completion of disclosure and full review of the evidence.");

newPage();

// ============================================================================
// SECTION 11: CHARGE FRAMING NOTE
// ============================================================================
addHeading("11. CHARGE FRAMING NOTE", 14, true);

addHeading("Mental Element", 12, true);
addParagraph("Even accepting the prosecution case at its highest, the mental element remains live and untested.", 10);

addHeading("Section 18 Requirements", 12, true);
addParagraph("Section 18 of the Offences Against the Person Act 1861 requires proof of:");
addParagraph("• Unlawful wounding (factual element)");
addParagraph("• With intent to cause grievous bodily harm (mental element)");

addHeading("Assessment", 12, true);
addParagraph("The factual element (wounding) may be established by the medical evidence. However, the mental element (specific intent to cause grievous bodily harm) is a separate matter requiring assessment of all the evidence, including:");
addParagraph("• The absence of motive, planning, or premeditation");
addParagraph("• The short duration and chaotic nature of the incident");
addParagraph("• The limitations of the identification and forensic evidence");
addParagraph("• The absence of expert opinion on specific intent");

addParagraph("The distinction between section 18 (specific intent) and section 20 (malicious wounding) or section 47 (assault occasioning actual bodily harm) remains a live issue.", 10);

newPage();

// ============================================================================
// SECTION 12: CASE MANAGEMENT & READINESS
// ============================================================================
addHeading("12. CASE MANAGEMENT & READINESS", 14, true);

addHeading("Trial Readiness", 12, true);
addParagraph("The defence cannot confirm trial readiness at this stage. Trial readiness is subject to:");
addParagraph("• Completion of disclosure obligations");
addParagraph("• Review of all outstanding material");
addParagraph("• Consideration of expert evidence requirements (if any)");
addParagraph("• Full analysis of all evidence");

addHeading("Disclosure Dependency", 12, true);
addParagraph("The defence position on trial readiness is dependent upon disclosure completion. The outstanding material identified in this document is required before the defence can properly assess the case and confirm readiness for trial.");

addHeading("Defence Estimate", 12, true);
addParagraph("The current trial estimate (5 days) may need review pending:");
addParagraph("• Completion of disclosure");
addParagraph("• Consideration of expert evidence");
addParagraph("• Assessment of witness requirements");
addParagraph("• Full case analysis");

addParagraph("The defence will update the court as soon as these matters are resolved. However, late disclosure or late identification of issues may impact the trial timetable.", 10);

newPage();

// ============================================================================
// SECTION 13: CONCLUSION
// ============================================================================
addHeading("13. CONCLUSION", 14, true);

addParagraph("This document is intended to stabilise disclosure, preserve defence positions, and ensure fairness prior to any substantive defence engagement.", 10);

addHeading("Summary", 12, true);
addParagraph("The defence has identified significant outstanding material required for proper case assessment:");
addParagraph("• Full unedited CCTV footage and handling records");
addParagraph("• Complete forensic methodology documentation");
addParagraph("• Full Code D identification process documentation");
addParagraph("• Facial recognition methodology and limitations");
addParagraph("• Timeline analysis and witness time estimates");

addParagraph("The defence is not trial-ready pending completion of disclosure obligations. Defence positions are expressly reserved. No factual account is advanced at this stage.", 10);

addParagraph("This document is prepared in the interests of ensuring full disclosure, procedural fairness, and proper case management.", 10);

addParagraph(`Prepared by: Defence Solicitors`, 10);
addParagraph(`Date: ${new Date().toLocaleDateString("en-GB")}`, 10);
addParagraph(`Case Reference: ${CASE_REF}`, 10);

// Finalize
doc.end();

stream.on("finish", () => {
  console.log(`✅ PDF generated successfully: ${outputFile}`);
  const stats = fs.statSync(outputFile);
  console.log(`📄 File size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`📑 Ready for upload to CaseBrain Hub`);
});

stream.on("error", (err) => {
  console.error("❌ Error generating PDF:", err);
});
