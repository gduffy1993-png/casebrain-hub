import "server-only";

import type {
  ExtractedCaseFacts,
  LetterDraftInput,
  LetterDraftOutput,
  CaseSummary,
} from "@/types";
import { env } from "./env";
import { getOpenAIClient } from "./openai";

const EXTRACTION_MODEL = env.OPENAI_EXTRACTION_MODEL;
const LETTER_MODEL = env.OPENAI_LETTER_MODEL;
const SUMMARY_MODEL = env.OPENAI_SUMMARY_MODEL;

type ExtractCaseFactsArgs = {
  documentText: string;
  documentName: string;
  orgId: string;
};

/**
 * 1) Extract structured case facts from a raw document
 *    Uses chat.completions with JSON output, NOT the Responses API.
 */
export async function extractCaseFacts({
  documentText,
  documentName,
  orgId,
}: ExtractCaseFactsArgs): Promise<ExtractedCaseFacts> {
  const client = getOpenAIClient();

  const completion = await client.chat.completions.create({
    model: EXTRACTION_MODEL,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "case_extraction_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          required: [
            "parties",
            "dates",
            "amounts",
            "claimType",
            "summary",
            "keyIssues",
            "timeline",
          ],
          properties: {
            parties: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["name", "role"],
                properties: {
                  name: { type: "string" },
                  role: {
                    type: "string",
                    enum: ["claimant", "defendant", "client", "opponent", "other"],
                  },
                  reference: { type: "string", nullable: true },
                },
              },
            },
            dates: {
              type: "array",
              items: {
                type: "object",
                required: ["label", "isoDate"],
                additionalProperties: false,
                properties: {
                  label: { type: "string" },
                  isoDate: { type: "string" },
                  description: { type: "string" },
                },
              },
            },
            amounts: {
              type: "array",
              items: {
                type: "object",
                required: ["label", "value", "currency"],
                additionalProperties: false,
                properties: {
                  label: { type: "string" },
                  value: { type: "number" },
                  currency: { type: "string" },
                },
              },
            },
            claimType: { type: "string" },
            summary: { type: "string" },
            keyIssues: {
              type: "array",
              items: { type: "string" },
            },
            timeline: {
              type: "array",
              items: {
                type: "object",
                required: ["id", "date", "label", "description", "source"],
                additionalProperties: false,
                properties: {
                  id: { type: "string" },
                  date: { type: "string" },
                  label: { type: "string" },
                  description: { type: "string" },
                  source: {
                    type: "string",
                    enum: ["document", "user", "system", "ai"],
                  },
                  metadata: { type: "object" },
                },
              },
            },
            piMeta: {
              type: "object",
              nullable: true,
              additionalProperties: false,
              properties: {
                oicTrack: {
                  type: "string",
                  enum: ["OIC", "MOJ", "Litigated", "Unknown"],
                  nullable: true,
                },
                injurySummary: { type: "string", nullable: true },
                whiplashTariffBand: { type: "string", nullable: true },
                prognosisMonthsMin: { type: "integer", nullable: true },
                prognosisMonthsMax: { type: "integer", nullable: true },
                psychInjury: { type: "boolean", nullable: true },
                treatmentRecommended: { type: "string", nullable: true },
                medcoReference: { type: "string", nullable: true },
                liabilityStance: {
                  type: "string",
                  enum: ["admitted", "denied", "partial", "unknown"],
                  nullable: true,
                },
              },
            },
            housingMeta: {
              type: "object",
              nullable: true,
              additionalProperties: false,
              properties: {
                tenantVulnerability: {
                  type: "array",
                  items: { type: "string" },
                  nullable: true,
                },
                propertyDefects: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      location: { type: "string", nullable: true },
                      severity: { type: "string", nullable: true },
                      firstReported: { type: "string", nullable: true },
                    },
                  },
                  nullable: true,
                },
                landlordResponses: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      date: { type: "string" },
                      type: { type: "string" },
                      text: { type: "string", nullable: true },
                    },
                  },
                  nullable: true,
                },
                hhsrsHazards: {
                  type: "array",
                  items: { type: "string" },
                  nullable: true,
                },
                unfitForHabitation: { type: "boolean", nullable: true },
                noAccessDays: { type: "integer", nullable: true },
                repairAttempts: { type: "integer", nullable: true },
              },
            },
            criminalMeta: {
              type: "object",
              nullable: true,
              additionalProperties: false,
              properties: {
                charges: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      offence: { type: "string" },
                      section: { type: "string", nullable: true },
                      date: { type: "string", nullable: true },
                      location: { type: "string", nullable: true },
                      value: { type: "number", nullable: true },
                      details: { type: "string", nullable: true },
                    },
                  },
                  nullable: true,
                },
                court: {
                  type: "string",
                  enum: ["Crown Court", "Magistrates Court", null],
                  nullable: true,
                },
                courtName: { type: "string", nullable: true },
                nextHearing: { type: "string", nullable: true },
                hearingType: {
                  type: "string",
                  enum: ["Plea Hearing", "Trial", "Sentencing", "First Hearing", null],
                  nullable: true,
                },
                bailStatus: {
                  type: "string",
                  enum: ["bailed", "remanded", "police_bail", null],
                  nullable: true,
                },
                bailConditions: {
                  type: "array",
                  items: { type: "string" },
                  nullable: true,
                },
                prosecutionEvidence: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: ["witness_statement", "CCTV", "forensic", "police_statement", "confession", "other"],
                      },
                      witness: { type: "string", nullable: true },
                      date: { type: "string", nullable: true },
                      credibility: {
                        type: "string",
                        enum: ["high", "medium", "low", null],
                        nullable: true,
                      },
                      content: { type: "string", nullable: true },
                      issues: {
                        type: "array",
                        items: { type: "string" },
                        nullable: true,
                      },
                    },
                  },
                  nullable: true,
                },
                defenseEvidence: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: ["alibi", "character", "expert", "other"],
                      },
                      witness: { type: "string", nullable: true },
                      statement: { type: "string", nullable: true },
                      date: { type: "string", nullable: true },
                      credibility: {
                        type: "string",
                        enum: ["high", "medium", "low", null],
                        nullable: true,
                      },
                    },
                  },
                  nullable: true,
                },
                paceCompliance: {
                  type: "object",
                  nullable: true,
                  properties: {
                    cautionGiven: { type: "boolean", nullable: true },
                    interviewRecorded: { type: "boolean", nullable: true },
                    rightToSolicitor: { type: "boolean", nullable: true },
                    detentionTime: { type: "integer", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    messages: [
      {
        role: "system",
        content: [
          {
            type: "text",
            text: `You are CaseBrain, an AI paralegal built for UK litigation teams operating within organisation ${orgId}. 
Extract structured parties, key dates, amounts, and timeline events from the supplied document. 
Use ISO-8601 date format (YYYY-MM-DD). Only return information grounded in the text.

If this appears to be a Personal Injury (PI) or RTA case, also extract OIC/MedCo-style metadata in the piMeta field:
- oicTrack: "OIC", "MOJ", "Litigated", or "Unknown" based on track mentioned
- injurySummary: Plain-language summary of injuries
- whiplashTariffBand: Tariff band if mentioned (e.g. "0-3 months", "3-6 months")
- prognosisMonthsMin/Max: Prognosis range in months if stated
- psychInjury: Whether psychological injury is mentioned
- treatmentRecommended: Treatment recommendations if stated
- medcoReference: MedCo reference number if present
- liabilityStance: "admitted", "denied", "partial", or "unknown" based on liability discussions

If this appears to be a Housing Disrepair / HRA case, also extract housing-specific metadata in the housingMeta field:
- tenantVulnerability: Array of vulnerability indicators (e.g. ["elderly", "asthma", "mobility", "child"])
- propertyDefects: Array of defects with type (damp, mould, leak, structural, heating, electrical, infestation), location, severity, firstReported date
- landlordResponses: Array of responses with date, type (acknowledgement, repair_scheduled, no_access, denial), and text
- hhsrsHazards: Array of HHSRS hazard categories mentioned (e.g. ["damp", "mould", "structural"])
- unfitForHabitation: Boolean if property described as unfit
- noAccessDays: Number of days landlord claimed no access
- repairAttempts: Count of repair attempts mentioned

If this appears to be a Criminal Law case, also extract criminal-specific metadata in the criminalMeta field:
- charges: Array of charges with offence name, section (e.g. "s.1 Theft Act 1968"), date, location, value (if applicable), details
- court: "Crown Court" or "Magistrates Court" if mentioned
- courtName: Name of the court if mentioned
- nextHearing: Date of next hearing if mentioned
- hearingType: "Plea Hearing", "Trial", "Sentencing", or "First Hearing" if mentioned
- bailStatus: "bailed", "remanded", or "police_bail" if mentioned
- bailConditions: Array of bail conditions (e.g. ["curfew", "reporting", "no_contact"])
- prosecutionEvidence: Array of evidence with type (witness_statement, CCTV, forensic, police_statement, confession), witness name, date, credibility (high/medium/low), content, issues
- defenseEvidence: Array of defense evidence with type (alibi, character, expert), witness, statement, date, credibility
- paceCompliance: Object with cautionGiven (boolean), interviewRecorded (boolean), rightToSolicitor (boolean), detentionTime (hours)

Leave piMeta, housingMeta, and criminalMeta fields null/empty if not clearly stated in the document.`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Document name: ${documentName}\n\nDocument:\n${documentText}`,
          },
        ],
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  const jsonText =
    typeof content === "string"
      ? content
      : Array.isArray(content)
      ? (content as Array<string | { text?: string }>).map((c) => (typeof c === "string" ? c : (c as any).text ?? "")).join("")
      : "";

  if (!jsonText) {
    throw new Error("OpenAI did not return any JSON for extractCaseFacts");
  }

  return JSON.parse(jsonText) as ExtractedCaseFacts;
}

/**
 * 2) Generate a letter draft from a template + facts
 * Now accepts pack, analysis, and outcome/complaint summaries for richer context
 */
export async function generateLetterDraft({
  template,
  facts,
  notes,
  actingFor,
  pack,
  analysis,
  outcomeSummary,
  complaintRiskSummary,
}: LetterDraftInput & {
  pack?: { id: string; label: string; promptHints?: { clientUpdate?: string } };
  analysis?: {
    risks?: Array<{ severity: string; label: string; description: string }>;
    missingEvidence?: Array<{ label: string; priority: string }>;
    limitation?: { daysRemaining?: number; isExpired?: boolean };
    keyIssues?: Array<{ label: string }>;
  };
  outcomeSummary?: { level: string; dimensions: Record<string, string>; notes: string[] };
  complaintRiskSummary?: { level: string; drivers: string[]; notes: string[] };
}): Promise<LetterDraftOutput> {
  const client = getOpenAIClient();

  const variables = {
    client: facts.parties.find((p) => p.role === "client")?.name ?? "",
    opponent:
      facts.parties.find((p) => p.role === "opponent")?.name ??
      facts.parties.find((p) => p.role === "defendant")?.name ??
      "",
    ref:
      facts.parties.find((p) => p.role === "client")?.reference ??
      facts.parties.find((p) => p.role === "defendant")?.reference ??
      "",
    deadline:
      facts.dates.find((d) => d.label.toLowerCase().includes("deadline"))
        ?.isoDate ?? "",
    facts: facts.summary,
  };

  const completion = await client.chat.completions.create({
    model: LETTER_MODEL,
    temperature: 0.3,
    presence_penalty: 0,
    frequency_penalty: 0,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "letter_draft_schema",
        schema: {
          type: "object",
          required: ["body", "reasoning", "risks"],
          properties: {
            body: { type: "string" },
            reasoning: { type: "string" },
            risks: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
    },
    messages: [
      {
        role: "system",
        content: [
          {
            type: "text",
            text: `You are CaseBrain, a UK litigation paralegal assistant drafting professional correspondence.
Draft in plain English, referencing CPR where relevant. Adapt tone for acting on behalf of the ${actingFor}. 
Use British spelling and include placeholders where data is missing.

${pack?.promptHints?.clientUpdate ? `Practice-specific guidance: ${pack.promptHints.clientUpdate}` : ""}

${complaintRiskSummary?.level === "high" 
  ? "IMPORTANT: This case has HIGH complaint risk. Be more explicit about uncertainties, risks, and manage client expectations carefully. Use cautious but professional language." 
  : ""}`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Template:\n${template.bodyTemplate}\n\nVariables:\n${JSON.stringify(
              variables,
              null,
              2,
            )}\n\nCase facts:\n${JSON.stringify(
              facts,
              null,
              2,
            )}\n\nNotes from fee earner:\n${notes ?? "None"}

${analysis ? `\nCase Analysis Context:\n${JSON.stringify({
  keyRisks: analysis.risks?.filter(r => r.severity === "CRITICAL" || r.severity === "HIGH").map(r => r.label).slice(0, 5) ?? [],
  missingEvidence: analysis.missingEvidence?.filter(e => e.priority === "CRITICAL" || e.priority === "HIGH").map(e => e.label).slice(0, 5) ?? [],
  limitationUrgent: analysis.limitation?.daysRemaining && analysis.limitation.daysRemaining <= 30 ? `Limitation: ${analysis.limitation.daysRemaining} days remaining` : undefined,
  keyIssues: analysis.keyIssues?.map(i => i.label).slice(0, 5) ?? [],
}, null, 2)}` : ""}

${outcomeSummary ? `\nOutcome Assessment:\n${JSON.stringify({
  overallLevel: outcomeSummary.level,
  dimensions: outcomeSummary.dimensions,
  notes: outcomeSummary.notes.slice(0, 3),
}, null, 2)}` : ""}

${complaintRiskSummary ? `\nComplaint Risk Factors:\n${JSON.stringify({
  level: complaintRiskSummary.level,
  drivers: complaintRiskSummary.drivers.slice(0, 3),
}, null, 2)}` : ""}`,
          },
        ],
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  const jsonText =
    typeof content === "string"
      ? content
      : Array.isArray(content)
      ? (content as Array<string | { text?: string }>).map((c) => (typeof c === "string" ? c : (c as any).text ?? "")).join("")
      : "";

  if (!jsonText) {
    throw new Error("OpenAI did not return any JSON for generateLetterDraft");
  }

  return JSON.parse(jsonText) as LetterDraftOutput;
}

/**
 * 3) Short document summary + bullets
 */
export async function summariseDocument(
  documentText: string,
): Promise<CaseSummary> {
  const client = getOpenAIClient();

  const completion = await client.chat.completions.create({
    model: SUMMARY_MODEL,
    temperature: 0.3,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "document_summary_schema",
        schema: {
          type: "object",
          required: ["summary", "bulletPoints"],
          properties: {
            summary: { type: "string" },
            bulletPoints: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
    },
    messages: [
      {
        role: "system",
        content: [
          {
            type: "text",
            text: `Provide a detailed summary (up to 1000 words if needed) with key bullet points for litigation case handlers. Be thorough and comprehensive, covering all important details from the document.`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: documentText,
          },
        ],
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  const jsonText =
    typeof content === "string"
      ? content
      : Array.isArray(content)
      ? (content as Array<string | { text?: string }>).map((c) => (typeof c === "string" ? c : (c as any).text ?? "")).join("")
      : "";

  if (!jsonText) {
    throw new Error("OpenAI did not return any JSON for summariseDocument");
  }

  return JSON.parse(jsonText) as CaseSummary;
}
