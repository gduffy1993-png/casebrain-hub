/**
 * Shared types for Clinical Negligence analysis modules
 */

export interface EvidenceFlag {
  id: string;
  label: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  reasoning: string;
  practiceArea?: string;
}

export interface BreachAnalysis {
  score: number; // 0–100
  level: "LOW" | "MEDIUM" | "HIGH" | "NONE";
  detected: boolean;
  flags: EvidenceFlag[];
  indicators: string[]; // For backward compatibility with momentum engine
}

export interface CausationAnalysis {
  score: number; // 0–100
  level: "LOW" | "MEDIUM" | "HIGH" | "NONE";
  detected: boolean;
  flags: EvidenceFlag[];
  indicators: string[]; // For backward compatibility with momentum engine
}

export interface HarmAnalysis {
  score: number; // 0–100
  level: "LOW" | "MEDIUM" | "HIGH" | "NONE" | "PRESENT";
  detected: boolean;
  flags: EvidenceFlag[];
  indicators: string[]; // For backward compatibility with momentum engine
}

