/** Repair OCR/PDF joins where words run together (e.g. "export logMay affect"). */
export function repairDisplayWordSpacing(text: string): string {
  let t = text;
  // Period glued to next word: reliability.Outstanding / material.Outstanding
  t = t.replace(/([a-z])\.([A-Z])/g, "$1. $2");
  // Direct jam: logMay → log. May
  t = t.replace(/\blogMay\b/gi, "log. May");
  t = t.replace(/\bCourtHearing/gi, "Court\x00HEARING\x00");
  // camelCase joins: exportLog → export Log
  t = t.replace(/([a-z])([A-Z][a-z])/g, "$1 $2");
  // Jammed modal verbs after nouns: logmay → log may
  t = t.replace(
    /([a-z]{2,})(may|can|will|shall|has|had|was|were|not|but|and|the)(?=\s|[,.;:!?]|$)/gi,
    "$1 $2",
  );
  // Sentence break before modal "May" in export-log / continuity lines
  t = t.replace(/\bexport log\s+May\b/gi, "export log. May");
  t = t.replace(/\blog\s+May\b/gi, "log. May");
  t = t.replace(/\s+/g, " ").trim();
  return t.replace(/\bCourt\x00HEARING\x00\b/gi, "CourtHearing");
}
