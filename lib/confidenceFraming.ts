/**
 * Confidence-Safe Language Enforcement
 * 
 * Replaces overconfident phrases with supervision-safe alternatives
 * while keeping outputs useful and actionable.
 */

/**
 * Wrap text with confidence-safe framing
 */
export function frameWithConfidence(text: string): string {
  if (!text || text.trim().length === 0) {
    return text;
  }

  // Common overconfident patterns to replace
  const replacements: Array<[RegExp, string]> = [
    // Absolute statements
    [/\b(It is|This is|The case is|The evidence is|The facts are)\s+(clear|obvious|certain|definite|proven|established|confirmed)\b/gi, "Based on the current documents, this suggests"],
    [/\b(We|The evidence|The facts|The case)\s+(proves|shows|demonstrates|establishes|confirms|indicates clearly)\b/gi, "Based on the current documents, this suggests"],
    [/\b(There is|There are)\s+(clear|definite|conclusive|strong)\s+(evidence|proof|indication)\b/gi, "Based on the current documents, there appears to be"],
    [/\b(It|This|The evidence|The case)\s+(clearly|obviously|definitely|certainly|undoubtedly|unquestionably)\b/gi, "Based on the current documents, this"],
    
    // Overconfident conclusions
    [/\b(Therefore|Thus|Hence|As a result|Consequently)\s+(it is|we can|the case|the evidence)\s+(clear|obvious|certain)\b/gi, "Based on the current documents, this suggests"],
    [/\b(We|The evidence|The facts)\s+(can|must|will)\s+(conclude|determine|establish|prove)\b/gi, "Based on the current documents, this suggests"],
    
    // Absolute risk statements
    [/\b(The|This)\s+(risk|danger|threat|issue|problem)\s+(is|will be|must be)\s+(critical|severe|high|significant)\b/gi, "Based on the current documents, this risk appears to be"],
    [/\b(There is|There are)\s+(a|an)\s+(high|significant|critical|severe)\s+(risk|danger|threat)\b/gi, "Based on the current documents, there appears to be a"],
    
    // Missing evidence overconfidence
    [/\b(The|This)\s+(evidence|document|information)\s+(is|will be|must be)\s+(required|necessary|essential|critical)\b/gi, "Based on the current documents, this evidence may be required"],
    [/\b(Without|Lacking)\s+(this|the|these)\s+(evidence|document|information)\b/gi, "Based on the current documents, without this"],
    
    // Key issues overconfidence
    [/\b(The|This)\s+(issue|problem|concern)\s+(is|will be|must be)\s+(critical|severe|significant|major)\b/gi, "Based on the current documents, this issue appears to be"],
    [/\b(This|The)\s+(case|matter)\s+(has|contains|presents)\s+(a|an)\s+(critical|severe|significant)\s+(issue|problem)\b/gi, "Based on the current documents, this case appears to have a"],
  ];

  let framed = text;

  for (const [pattern, replacement] of replacements) {
    framed = framed.replace(pattern, replacement);
  }

  // Add confidence qualifier at the start if not already present
  const hasConfidenceQualifier = /\b(Based on|According to|From the|In light of|Given the)\s+(current|available|provided|received)\s+(documents|evidence|information|materials)\b/i.test(framed);
  
  if (!hasConfidenceQualifier && framed.length > 50) {
    // Only add if it's a substantial statement
    const firstSentence = framed.split(/[.!?]\s+/)[0];
    if (firstSentence.length > 20 && !firstSentence.toLowerCase().startsWith("based on")) {
      framed = `Based on the current documents, ${framed.charAt(0).toLowerCase()}${framed.slice(1)}`;
    }
  }

  return framed;
}

/**
 * Frame a risk summary with confidence-safe language
 */
export function frameRiskSummary(summary: string): string {
  if (!summary) return summary;
  
  let framed = frameWithConfidence(summary);
  
  // Ensure risk summaries always have a qualifier
  if (!framed.toLowerCase().includes("based on") && !framed.toLowerCase().includes("suggests")) {
    framed = `Based on the current documents, ${framed.charAt(0).toLowerCase()}${framed.slice(1)}`;
  }
  
  // Add follow-up if needed
  if (!framed.toLowerCase().includes("further evidence") && !framed.toLowerCase().includes("additional")) {
    // Only add if it's a strong statement
    if (/\b(critical|severe|high|significant|major)\b/i.test(framed)) {
      framed += " Further evidence may be required to confirm this assessment.";
    }
  }
  
  return framed;
}

/**
 * Frame a key issue description with confidence-safe language
 */
export function frameKeyIssue(description: string): string {
  if (!description) return description;
  
  let framed = frameWithConfidence(description);
  
  // Ensure key issues have appropriate framing
  if (!framed.toLowerCase().includes("based on") && !framed.toLowerCase().includes("suggests")) {
    framed = `Based on the current documents, ${framed.charAt(0).toLowerCase()}${framed.slice(1)}`;
  }
  
  return framed;
}

/**
 * Frame a missing evidence explanation with confidence-safe language
 */
export function frameMissingEvidenceExplanation(explanation: string): string {
  if (!explanation) return explanation;
  
  let framed = frameWithConfidence(explanation);
  
  // Ensure missing evidence explanations are appropriately qualified
  if (!framed.toLowerCase().includes("based on") && !framed.toLowerCase().includes("may be")) {
    framed = `Based on the current documents, ${framed.charAt(0).toLowerCase()}${framed.slice(1)}`;
  }
  
  // Add standard qualifier for missing evidence
  if (!framed.toLowerCase().includes("further evidence") && !framed.toLowerCase().includes("additional")) {
    framed += " Further evidence may be required to confirm this assessment.";
  }
  
  return framed;
}

/**
 * Frame any analysis text generically
 */
export function frameAnalysisText(text: string, context?: "risk" | "issue" | "evidence" | "general"): string {
  if (!text) return text;
  
  switch (context) {
    case "risk":
      return frameRiskSummary(text);
    case "issue":
      return frameKeyIssue(text);
    case "evidence":
      return frameMissingEvidenceExplanation(text);
    default:
      return frameWithConfidence(text);
  }
}

