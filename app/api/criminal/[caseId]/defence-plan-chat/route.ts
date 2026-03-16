/**
 * POST /api/criminal/[caseId]/defence-plan-chat
 * Chat grounded in Defence Plan + criminal law corpus (CPIA, PACE, offence elements, sentencing, evidence, procedure, case law). No general knowledge.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getOpenAIClient } from "@/lib/openai";
import { retrieveLawChunks } from "@/lib/criminal/criminal-law-corpus";
import { getChangeListForContext } from "@/lib/criminal/verdict-change-list";

type RouteParams = { params: Promise<{ caseId: string }> };

const AI_TIMEOUT_MS = 25_000;
const MAX_MESSAGE_LENGTH = 800;
const MAX_REPLY_LENGTH = 2000;
const MAX_PLAN_SUMMARY_CHARS = 1200;
const MAX_EVIDENCE_CHARS = 1200;
const MAX_TIMELINE_CHARS = 500;
const LAW_CHUNKS_LIMIT = 4;
const MAX_OUTPUT_TOKENS = 1024;

const SYSTEM_PROMPT = `You are assisting a criminal defence solicitor in England & Wales. You answer ONLY using:
1) The agreed case summary and case theory line when provided — these are the canonical case narrative; use them first.
2) The Defence Plan summary provided for this case (stance, case theory, how we're running it, attack order, prosecution must prove, defence angles, winning angles, offence leverage, disclosure as weapon, if things change). Use these sections in your reasoning.
3) The evidence/disclosure context for this case. CRITICAL: For missing or outstanding disclosure, use ONLY the items listed in "MISSING DISCLOSURE ITEMS (use ONLY these...)". Never suggest or assume items (e.g. Charge Sheet, Witness Statements, Key Documentary Evidence) that are not in that list. If no missing items are listed, do not invent any.
4) The case timeline (next hearing, disclosure events) when provided. Use it to reason about what happened when and what is due.
5) The retrieved criminal law (e.g. CPIA, PACE, offence elements, sentencing, evidence, procedure, case law). Use it to ground your answer.

Rules:
- Do not give legal advice. Answer in scope of the plan and the law provided. If the law chunks don't cover the question, say so briefly.
- Be short and practical. No predictions ("the court will"), no made-up case law or sections.
- When the law chunks mention case names or authorities (e.g. R v Jogee, Turnbull guidelines, R v H and C), cite them in your answer where relevant so the solicitor can use the reference.
- For disclosure questions: only refer to the missing/outstanding items explicitly listed in the evidence context. Never fall back to generic disclosure lists.
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

  let body: { message?: string; planSummary?: string; evidenceSummary?: string; timelineSummary?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
  if (!message) {
    return NextResponse.json({ ok: false, error: "message is required" }, { status: 400 });
  }

  const planSummary = typeof body.planSummary === "string" ? body.planSummary.slice(0, MAX_PLAN_SUMMARY_CHARS) : "";
  const evidenceSummary = typeof body.evidenceSummary === "string" ? body.evidenceSummary.slice(0, MAX_EVIDENCE_CHARS) : "";
  const timelineSummary = typeof body.timelineSummary === "string" ? body.timelineSummary.slice(0, MAX_TIMELINE_CHARS) : "";

  // V2: Agreed case summary and case theory for chat grounding (canonical case narrative)
  let agreedBlock = "";
  try {
    const { data: agreedRow } = await supabase
      .from("criminal_cases")
      .select("agreed_summary_detailed, case_theory_line")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle();
    const detailed = (agreedRow as any)?.agreed_summary_detailed?.trim();
    const theory = (agreedRow as any)?.case_theory_line?.trim();
    if (detailed || theory) {
      const parts: string[] = [];
      if (theory) parts.push(`Agreed case theory line: ${theory}`);
      if (detailed) parts.push(`Agreed case summary (detailed):\n${detailed.slice(0, 1500)}`);
      agreedBlock = parts.join("\n\n");
    }
  } catch {
    // non-fatal
  }

  const lawChunks = await retrieveLawChunks(message, LAW_CHUNKS_LIMIT);
  const lawBlock =
    lawChunks.length > 0
      ? lawChunks
          .map((c) => `[${c.source}] ${c.title}\n${c.content_text}`)
          .join("\n\n---\n\n")
      : "(No matching law chunks in corpus for this question.)";

  const changeList = await getChangeListForContext(supabase, caseId, orgId);

  const contextParts: string[] = [];
  if (changeList) contextParts.push(changeList);
  if (agreedBlock) contextParts.push(`Agreed case narrative (use as canonical):\n${agreedBlock}`);
  if (planSummary) contextParts.push(`Defence Plan for this case:\n${planSummary}`);
  if (evidenceSummary) contextParts.push(`Evidence/disclosure for this case:\n${evidenceSummary}`);
  if (timelineSummary) contextParts.push(`Case timeline:\n${timelineSummary}`);
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
        max_tokens: MAX_OUTPUT_TOKENS,
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
