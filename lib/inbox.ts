import type { SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { env } from "./env";
import { getOpenAIClient } from "./openai";

export type AutoReply = {
  subject: string;
  body: string;
  tone: "formal" | "neutral";
  followUpTasks?: string[];
};

const opponentPattern =
  /From:\s*(.+?)\s*<([^>]+)>|Kind regards,\s*(.+)/i;

export function detectOpponent(message: {
  from?: string | null;
  body: string;
}): { name: string | null; email: string | null } {
  if (!message.from && !message.body) return { name: null, email: null };
  const combined = `${message.from ?? ""}\n${message.body ?? ""}`;
  const match = opponentPattern.exec(combined);
  if (!match) {
    return { name: null, email: null };
  }
  const name = match[1] ?? match[3] ?? null;
  const email = match[2] ?? null;
  return {
    name: name ? name.trim() : null,
    email: email ? email.trim() : null,
  };
}

export async function generateAutoReply({
  caseSummary,
  messageSummary,
  actingFor = "claimant",
}: {
  caseSummary?: string | null;
  messageSummary: string;
  actingFor?: "claimant" | "defendant";
}): Promise<AutoReply> {
  const client: OpenAI = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: env.OPENAI_LETTER_MODEL,
    temperature: 0.4,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "casebrain_autoreply",
        schema: {
          type: "object",
          required: ["subject", "body", "tone"],
          properties: {
            subject: { type: "string" },
            body: { type: "string" },
            tone: { type: "string", enum: ["formal", "neutral"] },
            followUpTasks: {
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
        content: `You are CaseBrain, drafting an email response on behalf of the ${actingFor}. Keep it concise, professional, and actionable.`,
      },
      {
        role: "user",
        content: `Case summary: ${caseSummary ?? "No summary provided"}

Incoming message summary: ${messageSummary}

Produce an email reply that acknowledges receipt, outlines next steps, and lists any follow-up tasks if appropriate.`,
      },
    ],
  });

  const output = response.choices[0]?.message?.content;
  if (!output) {
    return {
      subject: "Re: Follow-up",
      body: "Thank you for your email. We will revert shortly.",
      tone: "formal",
    };
  }

  try {
    const parsed = JSON.parse(output) as AutoReply;
    return parsed;
  } catch {
    return {
      subject: "Re: Follow-up",
      body: output,
      tone: "formal",
    };
  }
}

export async function storeOpponentRecord(
  client: SupabaseClient,
  input: {
    orgId: string;
    caseId: string;
    messageId: string;
    name: string | null;
    email: string | null;
  },
) {
  if (!input.name && !input.email) return;
  await client.from("mail_opponents").insert({
    org_id: input.orgId,
    case_id: input.caseId,
    message_id: input.messageId,
    name: input.name,
    email: input.email,
  });
}

