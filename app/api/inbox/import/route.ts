import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { assertRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { redact } from "@/lib/redact";
import { summariseDocument } from "@/lib/ai";
import { env } from "@/lib/env";
import {
  detectRiskFlags,
  storeRiskFlags,
  notifyHighSeverityFlags,
} from "@/lib/risk";
import {
  detectOpponent,
  generateAutoReply,
  storeOpponentRecord,
} from "@/lib/inbox";

export const runtime = "nodejs";

type IncomingMessage = {
  subject?: string;
  from?: string;
  body?: string;
  caseTitle?: string | null;
  receivedAt?: string | null;
};

export async function POST(request: Request) {
  const { userId, orgId } = await requireAuthContext();
  assertRateLimit(`inbox:${userId}`, { limit: 20, windowMs: 60_000 });

  const payload = (await request.json()) as {
    messages?: IncomingMessage[];
  };

  const messages = payload.messages ?? [];

  if (!messages.length) {
    return NextResponse.json(
      { error: "messages array is required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const results: { id: string }[] = [];

  for (const message of messages) {
    const subject = message.subject?.trim();
    const from = message.from?.trim();
    const body = message.body?.trim();

    if (!subject || !from || !body) {
      continue;
    }

    let caseId: string | null = null;

    if (message.caseTitle?.trim()) {
      const { data: caseRecord } = await supabase
        .from("cases")
        .select("id")
        .eq("org_id", orgId)
        .eq("title", message.caseTitle.trim())
        .maybeSingle();

      caseId = caseRecord?.id ?? null;
    }

    const receivedAt = message.receivedAt
      ? new Date(message.receivedAt)
      : new Date();

    const { redactedText, map } = redact(body, env.REDACTION_SECRET);
    const summary = await summariseDocument(redactedText);

    const { data: caseSummaryRecord } = caseId
      ? await supabase
          .from("cases")
          .select("summary")
          .eq("id", caseId)
          .maybeSingle()
      : { data: null };

    const autoReply = await generateAutoReply({
      caseSummary: caseSummaryRecord?.summary ?? null,
      messageSummary: summary.summary ?? redactedText.slice(0, 500),
    });

    const opponent = caseId
      ? detectOpponent({ from, body })
      : { name: null, email: null };

    const { data, error } = await supabase
      .from("mail_messages")
      .insert({
        org_id: orgId,
        case_id: caseId,
        subject,
        from_address: from,
        body,
        redacted_body: redactedText,
        redaction_map: map,
        summary,
        received_at: receivedAt.toISOString(),
        auto_reply: autoReply,
        opponent_name: opponent.name,
        opponent_email: opponent.email,
        requires_follow_up:
          (autoReply.followUpTasks?.length ?? 0) > 0,
      })
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to store message" },
        { status: 500 },
      );
    }

    if (caseId) {
      const riskCandidates = detectRiskFlags({
        orgId,
        caseId,
        sourceType: "mail",
        sourceId: data.id,
        documentName: subject,
        text: redactedText,
        extractedFacts: undefined, // Email extraction doesn't have structured facts yet
      });
      if (riskCandidates.length) {
        const storedFlags = await storeRiskFlags(supabase, riskCandidates);
        await notifyHighSeverityFlags(storedFlags, userId);
      }

      if (opponent.name || opponent.email) {
        await storeOpponentRecord(supabase, {
          orgId,
          caseId,
          messageId: data.id,
          name: opponent.name,
          email: opponent.email,
        });
      }

      if (autoReply.followUpTasks?.length) {
        await Promise.all(
          autoReply.followUpTasks.map((taskTitle) =>
            supabase.from("tasks").insert({
              org_id: orgId,
              case_id: caseId,
              title: taskTitle,
              description: `Created from auto-generated reply for ${subject}`,
              created_by: userId,
            }),
          ),
        );
      }
    }

    results.push({ id: data.id });
  }

  return NextResponse.json({ inserted: results.length, messages: results });
}

