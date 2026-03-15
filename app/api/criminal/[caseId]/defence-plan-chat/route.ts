/**
 * POST /api/criminal/[caseId]/defence-plan-chat
 * Chat grounded in Defence Plan + criminal law corpus (CPIA etc). No general knowledge.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getOpenAIClient } from "@/lib/openai";
import { retrieveLawChunks } from "@/lib/criminal/criminal-law-corpus";

type RouteParams = { params: Promise<{ caseId: string }> };

const AI_TIMEOUT_MS = 20_000;
const MAX_MESSAGE_LENGTH = 800;
const MAX_REPLY_LENGTH = 1000;
const LAW_CHUNKS_LIMIT = 5;

const SYSTEM_PROMPT = `You are assisting a criminal defence solicitor in England & Wales. You answer ONLY using:
1) The Defence Plan summary provided for this case (how we're running it, attack order, burdens).
2) The retrieved criminal law (e.g. CPIA disclosure duties, procedure). Use it to ground your answer.

Rules:
- Do not give legal advice. Answer in scope of the plan and the law provided. If the law chunks don't cover the question, say so briefly.
- Be short and practical. No predictions ("the court will"), no made-up case law or sections.
- If the question is outside the plan and law context, say you can only answer from the Defence Plan and criminal law in the system.`;

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { caseId } = await params;
  const authRes = await requireAuthContextApi();
  if (!authRes.ok) return authRes.response;
  const { orgId } = authRes.context;

  const supabase = getSupabaseAdminClient();
  const { data: caseRow, error: caseError } = await supabase
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .single();

  if (caseError || !caseRow) {
    return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
  }

  let body: { message?: string; planSummary?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
  if (!message) {
    return NextResponse.json({ ok: false, error: "message is required" }, { status: 400 });
  }

  const planSummary = typeof body.planSummary === "string" ? body.planSummary.slice(0, 2000) : "";

  const lawChunks = await retrieveLawChunks(message, LAW_CHUNKS_LIMIT);
  const lawBlock =
    lawChunks.length > 0
      ? lawChunks
          .map((c) => `[${c.source}] ${c.title}\n${c.content_text}`)
          .join("\n\n---\n\n")
      : "(No matching law chunks in corpus for this question.)";

  const contextParts: string[] = [];
  if (planSummary) contextParts.push(`Defence Plan for this case:\n${planSummary}`);
  contextParts.push(`Relevant criminal law (use only this):\n${lawBlock}`);
  const userContent = `${contextParts.join("\n\n")}\n\n---\nSolicitor question:\n${message}`;

  const openai = getOpenAIClient();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let completion;
  try {
    completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        max_tokens: 500,
        temperature: 0.2,
      },
      { signal: controller.signal }
    );
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { ok: false, error: isAbort ? "Request timed out" : "Unable to get a response" },
      { status: 502 }
    );
  }
  clearTimeout(timeoutId);

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  const reply = raw.slice(0, MAX_REPLY_LENGTH);

  return NextResponse.json({ ok: true, reply }, { status: 200 });
}
