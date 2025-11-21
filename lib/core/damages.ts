"use server";

import type { ExtractedCaseFacts } from "@/types";

/**
 * Core Litigation Brain - Damages / Compensation Support
 * 
 * Provides claim-type specific heads of loss and statement of loss scaffolding.
 * Case-type modules extend this with specific calculators.
 */

export type DamageHead = {
  category: string;
  description: string;
  amount?: number;
  currency: string;
  evidence?: string[];
  confidence: "high" | "medium" | "low";
};

export type StatementOfLoss = {
  generalDamages?: {
    description: string;
    range?: { min: number; max: number };
    evidence: string[];
  };
  specialDamages: DamageHead[];
  futureLoss?: DamageHead[];
  total: {
    amount: number;
    currency: string;
    confidence: "high" | "medium" | "low";
  };
  disclaimer: string;
};

/**
 * Extract damages from case facts
 */
export function extractDamages(facts: ExtractedCaseFacts): StatementOfLoss {
  const specialDamages: DamageHead[] = facts.amounts.map((amount) => ({
    category: amount.label,
    description: amount.label,
    amount: amount.value,
    currency: amount.currency,
    evidence: [amount.label],
    confidence: "high",
  }));

  const total = specialDamages.reduce(
    (sum, head) => sum + (head.amount ?? 0),
    0,
  );

  return {
    specialDamages,
    total: {
      amount: total,
      currency: specialDamages[0]?.currency ?? "GBP",
      confidence: specialDamages.length > 0 ? "high" : "low",
    },
    disclaimer:
      "These figures are extracted from evidence and should be verified. General damages require professional assessment based on case type and severity.",
  };
}

/**
 * Scaffold statement of loss structure
 */
export function scaffoldStatementOfLoss(
  practiceArea?: string,
): Array<{ category: string; description: string; required: boolean }> {
  const baseHeads = [
    { category: "General Damages", description: "Pain, suffering, loss of amenity", required: true },
    { category: "Special Damages", description: "Financial losses to date", required: true },
  ];

  if (practiceArea === "pi" || practiceArea === "clinical_negligence") {
    return [
      ...baseHeads,
      { category: "Medical Expenses", description: "Treatment costs", required: false },
      { category: "Loss of Earnings", description: "Past and future", required: false },
      { category: "Care Costs", description: "Past and future care", required: false },
      { category: "Travel Expenses", description: "Medical appointments", required: false },
    ];
  }

  if (practiceArea === "housing_disrepair") {
    return [
      ...baseHeads,
      { category: "Discomfort & Inconvenience", description: "General damages", required: true },
      { category: "Property Damage", description: "Damage to belongings", required: false },
      { category: "Additional Heating Costs", description: "Due to disrepair", required: false },
      { category: "Alternative Accommodation", description: "If applicable", required: false },
    ];
  }

  return baseHeads;
}

