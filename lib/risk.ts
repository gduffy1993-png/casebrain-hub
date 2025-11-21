import type { SupabaseClient } from "@supabase/supabase-js";
import type { RiskFlagRecord } from "@/types";
import { getSupabaseAdminClient } from "./supabase";
import { sendTaskNotifications, buildTaskLink } from "./notifications";
import { buildLimitationMessage, type LimitationContext } from "./core/riskCopy";
import { calculateLimitation } from "./core/limitation";

type RiskDetectionInput = {
  orgId: string;
  caseId: string;
  sourceType: string;
  sourceId?: string;
  documentName?: string;
  text: string;
  extractedFacts?: {
    practiceArea?: string;
    housingMeta?: {
      hhsrs_category_1_hazards?: string[];
      hhsrs_category_2_hazards?: string[];
      unfit_for_habitation?: boolean;
      tenant_vulnerability?: string[];
    };
    dates?: Array<{ label: string; isoDate: string }>;
    timeline?: Array<{ date: string; label: string }>;
  };
};

type Pattern = {
  flagType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: (match: string, context: string, input: RiskDetectionInput) => string;
  regex: RegExp;
};

const PATTERNS: Pattern[] = [
  {
    flagType: "limitation_period",
    severity: "critical",
    regex: /\b(limitation|time[-\s]?barred|time\s*limit)\b/gi,
    description: (_match, _context, input) => {
      // Build LimitationContext from available data
      const context: LimitationContext = {
        statusLabel: "Outstanding",
        practiceArea: (input.extractedFacts?.practiceArea as any) ?? "other",
        timeline: (input.extractedFacts?.timeline?.length ?? 0) > 0,
      };

      // Extract limitation date from extracted facts if available
      const limitationDate = input.extractedFacts?.dates?.find(
        (d) => d.label.toLowerCase().includes("limitation") || d.label.toLowerCase().includes("expir"),
      )?.isoDate;
      if (limitationDate) {
        context.limitationDate = limitationDate;
      }

      // Extract hazard info from housing metadata if available
      if (input.extractedFacts?.housingMeta) {
        const meta = input.extractedFacts.housingMeta;
        if (meta.hhsrs_category_1_hazards && meta.hhsrs_category_1_hazards.length > 0) {
          context.hazard = {
            level: 1,
            type: meta.hhsrs_category_1_hazards[0].toLowerCase().replace(/\s+/g, "_"),
          };
        } else if (meta.hhsrs_category_2_hazards && meta.hhsrs_category_2_hazards.length > 0) {
          context.hazard = {
            level: 2,
            type: meta.hhsrs_category_2_hazards[0].toLowerCase().replace(/\s+/g, "_"),
          };
        }
        context.specialDamages =
          meta.unfit_for_habitation || (meta.tenant_vulnerability?.length ?? 0) > 0;
      }

      // If we have a limitation date, calculate severity
      if (context.limitationDate) {
        const limitationResult = calculateLimitation({
          incidentDate: context.limitationDate,
          practiceArea: context.practiceArea ?? "other",
        });
        context.limitationDate = limitationResult.limitationDate;
      }

      return buildLimitationMessage(context);
    },
  },
  {
    flagType: "without_prejudice",
    severity: "high",
    regex: /\bwithout\s+prejudice\b/gi,
    description: (_match, context, _input) =>
      `Document marked "without prejudice": "${context}". Ensure appropriate handling.`,
  },
  {
    flagType: "settlement_offer",
    severity: "high",
    regex: /\b(offer(ed)?\s+to\s+settle|settlement\s+offer|part\s+36)\b/gi,
    description: (_match, context, _input) =>
      `Settlement or Part 36 language found: "${context}". Consider deadlines and acceptance strategy.`,
  },
  {
    flagType: "confidentiality_breach",
    severity: "high",
    regex: /\b(confidential|privileged|privilege)\b.*\b(disclose|disclosure|breach|shared)\b/gi,
    description: (_match, context, _input) =>
      `Potential confidentiality issue: "${context}". Confirm correct handling.`,
  },
  {
    flagType: "data_protection",
    severity: "medium",
    regex: /\b(gdpr|data\s+breach|personal\s+data|ico)\b/gi,
    description: (_match, context, _input) =>
      `Data protection language found: "${context}". Ensure compliance follow-up.`,
  },
  {
    flagType: "urgent_deadline",
    severity: "high",
    regex: /\b(deadline|due\s+by|respond\s+within)\b[^.]{0,80}\b(day|hour|tomorrow|immediate)\b/gi,
    description: (_match, context, _input) =>
      `Urgent deadline referenced: "${context}". Validate task scheduling.`,
  },
  {
    flagType: "financial_risk",
    severity: "medium",
    regex: /\b(£|\$|€)\s?\d{2,}(,\d{3})*(\.\d{2})?\b/gi,
    description: (match, _context, _input) =>
      `Significant monetary value mentioned (${match}). Ensure exposure recorded.`,
  },
];

function extractContext(text: string, index: number) {
  const window = 120;
  const start = Math.max(index - window, 0);
  const end = Math.min(index + window, text.length);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

export function detectRiskFlags(input: RiskDetectionInput) {
  const flags: Omit<RiskFlagRecord, "id" | "created_at" | "detected_at">[] = [];
  PATTERNS.forEach((pattern) => {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.regex);
    while ((match = regex.exec(input.text)) !== null) {
      const context = extractContext(input.text, match.index);
      flags.push({
        org_id: input.orgId,
        case_id: input.caseId,
        source_type: input.sourceType,
        source_id: input.sourceId ?? null,
        flag_type: pattern.flagType,
        severity: pattern.severity,
        description: pattern.description(match[0], context, input),
        metadata: {
          context,
          documentName: input.documentName,
        },
        resolved: false,
        resolved_at: null,
      });
    }
  });

  return flags;
}

export async function storeRiskFlags(
  client: SupabaseClient,
  flags: Omit<RiskFlagRecord, "id" | "created_at" | "detected_at">[],
) {
  if (!flags.length) return [];
  const { data, error } = await client
    .from("risk_flags")
    .insert(
      flags.map((flag) => ({
        ...flag,
        metadata: flag.metadata ?? {},
      })),
    )
    .select("*");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function notifyHighSeverityFlags(
  flags: RiskFlagRecord[],
  createdBy: string,
) {
  const highPriority = flags.filter((flag) =>
    ["high", "critical"].includes(flag.severity),
  );

  if (!highPriority.length) return;

  const supabase = getSupabaseAdminClient();

  await Promise.all(
    highPriority.map(async (flag) => {
      const { data: task } = await supabase
        .from("tasks")
        .insert({
          org_id: flag.org_id,
          case_id: flag.case_id,
          title: `Investigate ${flag.flag_type.replace(/_/g, " ")}`,
          description: flag.description,
          created_by: createdBy,
          due_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();

      const link = buildTaskLink(task?.id ?? flag.id);

      await sendTaskNotifications(
        flag.org_id,
        `Risk alert (${flag.severity.toUpperCase()}): ${flag.description}`,
        link,
      );
    }),
  );
}

