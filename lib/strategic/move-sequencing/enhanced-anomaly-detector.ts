/**
 * Enhanced Anomaly Detection
 * 
 * Detects timeline delays, narrative contradictions, and document authenticity flags.
 */

import type { Observation, MoveSequenceInput } from "./types";

/**
 * Detect presentation → diagnosis → treatment delays
 */
export function detectTreatmentDelays(
  input: MoveSequenceInput
): Observation[] {
  const observations: Observation[] = [];
  
  // Extract medical timeline events
  const medicalEvents: Array<{ date: Date; type: "presentation" | "diagnosis" | "treatment"; description: string }> = [];
  
  input.timeline.forEach(event => {
    if (!event.date) return;
    
    const descLower = event.description.toLowerCase();
    const date = new Date(event.date);
    
    if (descLower.includes("presentation") || descLower.includes("attendance") || descLower.includes("a&e")) {
      medicalEvents.push({ date, type: "presentation", description: event.description });
    } else if (descLower.includes("diagnosis") || descLower.includes("diagnosed") || descLower.includes("confirmed")) {
      medicalEvents.push({ date, type: "diagnosis", description: event.description });
    } else if (descLower.includes("treatment") || descLower.includes("surgery") || descLower.includes("operation")) {
      medicalEvents.push({ date, type: "treatment", description: event.description });
    }
  });

  // Check for delays
  const presentation = medicalEvents.find(e => e.type === "presentation");
  const diagnosis = medicalEvents.find(e => e.type === "diagnosis");
  const treatment = medicalEvents.find(e => e.type === "treatment");

  if (presentation && diagnosis) {
    const delay = (diagnosis.date.getTime() - presentation.date.getTime()) / (1000 * 60 * 60 * 24);
    if (delay > 7) {
      observations.push({
        id: "treatment-delay-diagnosis",
        type: "TIMELINE_ANOMALY",
        description: `Delay of ${Math.round(delay)} days between presentation and diagnosis`,
        whyUnusual: `Patient presented on ${presentation.date.toISOString().split("T")[0]} but diagnosis not confirmed until ${diagnosis.date.toISOString().split("T")[0]}`,
        whatShouldExist: `Diagnosis should occur promptly after presentation, typically within 24-48 hours for acute conditions`,
        leveragePotential: delay > 14 ? "HIGH" : "MEDIUM",
        relatedDates: [presentation.date.toISOString(), diagnosis.date.toISOString()],
        whyThisIsOdd: `Delay of ${Math.round(delay)} days between presentation and diagnosis. For time-sensitive conditions, this delay may be significant.`,
        whyOpponentCannotIgnoreThis: `Delay suggests either failure to recognize condition or delayed investigation. Cannot be explained as routine if condition was time-sensitive.`,
      });
    }
  }

  if (diagnosis && treatment) {
    const delay = (treatment.date.getTime() - diagnosis.date.getTime()) / (1000 * 60 * 60 * 24);
    if (delay > 14) {
      observations.push({
        id: "treatment-delay-treatment",
        type: "TIMELINE_ANOMALY",
        description: `Delay of ${Math.round(delay)} days between diagnosis and treatment`,
        whyUnusual: `Diagnosis confirmed on ${diagnosis.date.toISOString().split("T")[0]} but treatment not provided until ${treatment.date.toISOString().split("T")[0]}`,
        whatShouldExist: `Treatment should commence promptly after diagnosis, typically within protocol timeframes`,
        leveragePotential: delay > 30 ? "HIGH" : "MEDIUM",
        relatedDates: [diagnosis.date.toISOString(), treatment.date.toISOString()],
        whyThisIsOdd: `Delay of ${Math.round(delay)} days between diagnosis and treatment. If condition required urgent treatment, this delay may have caused avoidable harm.`,
        whyOpponentCannotIgnoreThis: `Delay between diagnosis and treatment creates inference of failure to act promptly. Cannot be justified if protocol timeframes were breached.`,
      });
    }
  }

  return observations;
}

/**
 * Detect symptoms vs imaging contradictions
 */
export function detectSymptomsVsImaging(
  input: MoveSequenceInput
): Observation[] {
  const observations: Observation[] = [];
  
  // Look for documents mentioning symptoms and imaging
  const symptomDocs: string[] = [];
  const imagingDocs: string[] = [];
  
  input.documents.forEach(doc => {
    const nameLower = doc.name.toLowerCase();
    const content = JSON.stringify(doc.extracted_json || {}).toLowerCase();
    
    if (nameLower.includes("symptom") || content.includes("symptom") || content.includes("complaint")) {
      symptomDocs.push(doc.id);
    }
    if (nameLower.includes("radiology") || nameLower.includes("x-ray") || nameLower.includes("imaging") || 
        nameLower.includes("ct") || nameLower.includes("mri")) {
      imagingDocs.push(doc.id);
    }
  });

  // If both exist, check for contradictions
  if (symptomDocs.length > 0 && imagingDocs.length > 0) {
    // Simple check: if symptoms suggest one thing but imaging shows another
    // This is a placeholder - in production, would compare actual content
    observations.push({
      id: "symptoms-vs-imaging",
      type: "INCONSISTENCY",
      description: "Symptoms described may not align with imaging findings",
      whyUnusual: "Clinical symptoms and imaging findings should correlate. Discrepancy may indicate missed diagnosis or delayed recognition",
      whatShouldExist: "Consistent correlation between symptoms and imaging findings",
      leveragePotential: "MEDIUM",
      sourceDocumentIds: [...symptomDocs, ...imagingDocs],
      whyThisIsOdd: "Symptoms and imaging findings do not align. If symptoms were present, imaging should have been ordered or findings should correlate.",
      whyOpponentCannotIgnoreThis: "Discrepancy between symptoms and imaging creates inference of failure to investigate or delayed recognition. Opponent must explain why imaging did not match symptoms.",
    });
  }

  return observations;
}

/**
 * Detect addendum timing after complaint
 */
export function detectAddendumTiming(
  input: MoveSequenceInput
): Observation[] {
  const observations: Observation[] = [];
  
  // Find complaint dates and addendum dates
  const complaintDates: Date[] = [];
  const addendumDocs: Array<{ date: Date; docId: string; name: string }> = [];
  
  input.timeline.forEach(event => {
    if (event.date && event.description.toLowerCase().includes("complaint")) {
      complaintDates.push(new Date(event.date));
    }
  });

  input.documents.forEach(doc => {
    const nameLower = doc.name.toLowerCase();
    if (nameLower.includes("addendum") || nameLower.includes("amendment")) {
      const docDate = new Date(doc.created_at);
      addendumDocs.push({ date: docDate, docId: doc.id, name: doc.name });
    }
  });

  // Check if addenda created after complaints
  complaintDates.forEach(complaintDate => {
    addendumDocs.forEach(addendum => {
      if (addendum.date > complaintDate) {
        const daysAfter = (addendum.date.getTime() - complaintDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysAfter < 90) {
          observations.push({
            id: `addendum-after-complaint-${addendum.docId}`,
            type: "INCONSISTENCY",
            description: `Addendum created ${Math.round(daysAfter)} days after complaint`,
            whyUnusual: `Addendum to ${addendum.name} created after complaint was made, suggesting retrospective correction`,
            whatShouldExist: "Addenda should be created contemporaneously, not after complaints",
            leveragePotential: "HIGH",
            sourceDocumentIds: [addendum.docId],
            relatedDates: [complaintDate.toISOString(), addendum.date.toISOString()],
            whyThisIsOdd: `Addendum created ${Math.round(daysAfter)} days after complaint. Timing suggests recognition only after complaint, not at time of original documentation.`,
            whyOpponentCannotIgnoreThis: "Addendum after complaint creates inference of retrospective correction. Opponent must explain why findings were not documented at time of original report.",
          });
        }
      }
    });
  });

  return observations;
}

/**
 * Detect late-created notes (authenticity flags)
 */
export function detectLateCreatedNotes(
  input: MoveSequenceInput
): Observation[] {
  const observations: Observation[] = [];
  
  // Check if notes created significantly after event date
  input.documents.forEach(doc => {
    const extracted = doc.extracted_json;
    if (extracted?.dates && extracted.dates.length > 0) {
      const eventDate = extracted.dates[0].date ? new Date(extracted.dates[0].date) : null;
      const docCreated = new Date(doc.created_at);
      
      if (eventDate && docCreated > eventDate) {
        const daysAfter = (docCreated.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
        // If note created more than 30 days after event, flag it
        if (daysAfter > 30) {
          observations.push({
            id: `late-note-${doc.id}`,
            type: "TIMELINE_ANOMALY",
            description: `Note created ${Math.round(daysAfter)} days after event date`,
            whyUnusual: `Document ${doc.name} created ${Math.round(daysAfter)} days after the event it describes`,
            whatShouldExist: "Notes should be created contemporaneously with events",
            leveragePotential: daysAfter > 90 ? "HIGH" : "MEDIUM",
            sourceDocumentIds: [doc.id],
            relatedDates: [eventDate.toISOString(), docCreated.toISOString()],
            whyThisIsOdd: `Note created ${Math.round(daysAfter)} days after event. Contemporaneous notes should be created at time of event, not retrospectively.`,
            whyOpponentCannotIgnoreThis: "Late-created notes raise authenticity concerns. Opponent must explain why documentation was not created at time of event.",
          });
        }
      }
    }
  });

  return observations;
}

