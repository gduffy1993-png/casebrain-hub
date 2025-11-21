/**
 * Core Litigation Brain - Shared Types
 * 
 * Central type definitions for risk alerts, limitation calculations, and procedural guidance.
 */

export type RiskSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface RiskRecommendedAction {
  id: string;
  label: string; // short title e.g. "Confirm date of knowledge"
  description: string; // 1–2 lines of detail
  priority: "normal" | "high" | "urgent";
}

export interface RiskAlert {
  id: string;
  type: "limitation" | "awaabs_law" | "section_11" | "compliance" | "evidence_gap" | "other";
  title: string; // e.g. "Limitation period – critical"
  message: string; // main paragraph, no more than 3 sentences
  severity: RiskSeverity;
  deadlineDate?: string; // ISO date if relevant (e.g. limitation deadline)
  status: "outstanding" | "resolved" | "snoozed";
  recommendedActions?: RiskRecommendedAction[];
  sourceEvidence?: string[]; // ids or short refs to timeline events/docs
  createdAt?: string;
  updatedAt?: string;
}

