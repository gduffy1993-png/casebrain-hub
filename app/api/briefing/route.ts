import { addDays, startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { assertRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getOpenAIClient } from "@/lib/openai";
import { env } from "@/lib/env";
import { createTaskFromBriefing } from "@/lib/tasks";

export const runtime = "nodejs";

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

function parseBriefingText(briefingText: string): { summary: string; actions: string[] } {
  const normalized = briefingText.replace(/\r\n/g, "\n").trim();

  if (!normalized.length) {
    return { summary: "", actions: [] };
  }

  const actionsHeader = normalized.match(/(?:^|\n)\s*(Actions?|Action Items?|Next Steps?):/i);
  let summarySection = normalized;
  let actions: string[] = [];

  if (actionsHeader && typeof actionsHeader.index === "number") {
    const headerIndex = actionsHeader.index;
    const headerLength = actionsHeader[0].length;
    summarySection = normalized.slice(0, headerIndex).trim();

    const actionsBlock = normalized.slice(headerIndex + headerLength).trim();
    actions = actionsBlock
      .split("\n")
      .map((line) => line.trim().replace(/^[-•*()\d.\s]+/, ""))
      .filter(Boolean);
  }

  const summary = summarySection.replace(/^Summary:\s*/i, "").trim();

  return {
    summary,
    actions,
  };
}

export async function POST() {
  const { userId, orgId } = await requireAuthContext();
  assertRateLimit(`briefing:${userId}`, { limit: 5, windowMs: 60_000 });

  const now = new Date();
  const supabase = getSupabaseAdminClient();
  const dayStart = startOfDay(now);
  const upcomingLimit = addDays(dayStart, 14);

  const [documentsResult, lettersResult, deadlinesResult, risksResult] = await Promise.all([
    supabase
      .from("documents")
      .select(
        "id, name, created_at, extracted_json, cases!inner(id, title, org_id)",
      )
      .eq("cases.org_id", orgId)
      .gte("created_at", dayStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("letters")
      .select(
        "id, version, created_at, draft, cases!inner(id, title, org_id)",
      )
      .eq("cases.org_id", orgId)
      .gte("created_at", dayStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("deadlines")
      .select("id, label, due_date, rule, cases!inner(id, title, org_id)")
      .eq("cases.org_id", orgId)
      .gte("due_date", toDateString(dayStart))
      .lte("due_date", toDateString(upcomingLimit))
      .order("due_date", { ascending: true })
      .limit(20),
    supabase
      .from("risk_flags")
      .select(
        "id, flag_type, severity, description, detected_at, cases!inner(id, title, org_id)",
      )
      .eq("cases.org_id", orgId)
      .eq("resolved", false)
      .order("detected_at", { ascending: false })
      .limit(20),
  ]);

  const documents = documentsResult.data ?? [];
  const letters = lettersResult.data ?? [];
  const deadlines = deadlinesResult.data ?? [];
  const riskFlags = risksResult.data ?? [];

  const resolveCaseTitle = (
    record:
      | { cases?: { title?: string } | Array<{ title?: string }> }
      | undefined
      | null,
  ) => {
    if (!record?.cases) {
      return "Unlinked";
    }
    if (Array.isArray(record.cases)) {
      return record.cases[0]?.title ?? "Unlinked";
    }
    return record.cases.title ?? "Unlinked";
  };

  const documentLines =
    documents
      .map((document) => {
        const extraction = document.extracted_json as
          | {
              summary?: string;
              aiSummary?: { summary?: string; bulletPoints?: string[] };
            }
          | null
          | undefined;
        const summary =
          extraction?.aiSummary?.summary ??
          extraction?.summary ??
          "Summary pending";

        const caseTitle = resolveCaseTitle(document);
        return `- ${document.name} (Case: ${caseTitle}, Uploaded: ${document.created_at}) — ${summary}`;
      })
      .join("\n") || "None.";

  const letterLines =
    letters
      .map(
        (letter) => {
          const caseTitle = resolveCaseTitle(letter);
          return `- Case: ${caseTitle} (v${letter.version}) drafted at ${letter.created_at}`;
        },
      )
      .join("\n") || "None.";

  const deadlineLines =
    deadlines
      .map(
        (deadline) => {
          const caseTitle = resolveCaseTitle(deadline);
          const rule = deadline.rule ? `, rule ${deadline.rule}` : "";
          return `- ${deadline.label} on ${deadline.due_date} (Case: ${caseTitle}${rule})`;
        },
      )
      .join("\n") || "None.";

  const riskLines =
    riskFlags
      .map((flag) => {
        const caseTitle = resolveCaseTitle(flag);
        return `- [${flag.severity.toUpperCase()}] ${flag.flag_type.replace(
          /_/g,
          " ",
        )} — ${flag.description} (Case: ${caseTitle})`;
      })
      .join("\n") || "None.";

  let prompt = `Today is ${now.toISOString()}.
Provide a concise but actionable briefing for the litigation team at organisation ${orgId}.

New documents today:
${documentLines}

Letters drafted today:
${letterLines}

Deadlines due within 14 days:
${deadlineLines}`;

  if (riskLines !== "None.") {
    prompt += `\n\nOutstanding risk alerts:\n${riskLines}`;
  }

  if (!env.OPENAI_API_KEY) {
    console.error("[briefing] OPENAI_API_KEY is not configured.");
    return NextResponse.json(
      { error: "AI briefing is unavailable. Please contact an administrator." },
      { status: 500 },
    );
  }

  const client = getOpenAIClient();

  let responseText: string;
  try {
    const response = await client.chat.completions.create({
      model: env.OPENAI_SUMMARY_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "You are CaseBrain, an AI paralegal preparing a daily briefing. Be practical, highlight risks, and list no more than five priority actions. Respond with a 'Summary:' section followed by an 'Actions:' section.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    responseText = (response.choices[0]?.message?.content ?? "").trim();
  } catch (error) {
    console.error("[briefing] OpenAI API error:", error);
    return NextResponse.json(
      {
        error: "Unable to generate the briefing right now. Please try again shortly.",
      },
      { status: 500 },
    );
  }

  if (!responseText) {
    console.error("[briefing] OpenAI API returned an empty payload.");
    return NextResponse.json(
      { error: "Failed to generate briefing" },
      { status: 500 },
    );
  }

  const parsed = parseBriefingText(responseText);
  const summaryText = parsed.summary.length ? parsed.summary : responseText;
  const actions = parsed.actions;

  const responsePayload = {
    summary: summaryText,
    actions,
    generatedAt: now.toISOString(),
    riskAlerts: riskLines,
    briefingText: responseText,
  };

  await createTaskFromBriefing({
    orgId,
    createdBy: userId,
    summary: `Summary generated at ${now.toLocaleTimeString(
      "en-GB",
    )}. Actions: ${
      actions.length ? actions.join("; ") : "No immediate actions supplied."
    }. ${
      riskLines === "None."
        ? "No outstanding risk alerts."
        : `Outstanding risk alerts: ${riskLines}`
    }\nSummary: ${summaryText}`,
  });

  return NextResponse.json(responsePayload);
}

