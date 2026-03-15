/**
 * POST /api/criminal/[caseId]/disclosure-request
 * Phase 5.4: Generate a draft disclosure request based on case context and CPIA.
 * Body: { planSummary?, evidenceSummary?, timelineSummary? }. Returns { ok, text }.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getOpenAIClient } from "@/lib/openai";
import { retrieveLawChunks } from "@/lib/criminal/criminal-law-corpus";

type RouteParams = { params: Promise<{ caseId: string }> };

const AI_TIMEOUT_MS = 25_000;
const MAX_TEXT_LENGTH = 2000;

const SYSTEM_PROMPT = `You are assisting a criminal defence solicitor in England & Wales. Your task is to draft a short, practical disclosure request that the defence might send to the prosecution.

Use ONLY:
1) The case context provided (plan, evidence/disclosure state, timeline).
2) The CPIA and disclosure law provided.

Output a concise draft request: bullet points or short paragraphs. Include:
- Specific items or categories of material that should be disclosed (refer to the case context).
- Brief reference to the CPIA test (material that might undermine the prosecution case or assist the defence).
Do not invent facts. Do not give legal advice. If the law chunks mention case names (e.g. on disclosure), cite them where relevant. State that the solicitor must verify and adapt the draft.`;

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

  let body: { planSummary?: string; evidenceSummary?: string; timelineSummary?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const planSummary = typeof body.planSummary === "string" ? body.planSummary.slice(0, 2000) : "";
  const evidenceSummary = typeof body.evidenceSummary === "string" ? body.evidenceSummary.slice(0, 1500) : "";
  const timelineSummary = typeof body.timelineSummary === "string" ? body.timelineSummary.slice(0, 800) : "";

  const lawChunks = await retrieveLawChunks(
    "disclosure request prosecution material unused CPIA section 3 section 8",
    6
  );
  const lawBlock =
    lawChunks.length > 0
      ? lawChunks.map((c) => `[${c.source}] ${c.title}\n${c.content_text}`).join("\n\n---\n\n")
      : "(No law chunks retrieved.)";

  const contextParts: string[] = [];
  if (planSummary) contextParts.push(`Defence Plan:\n${planSummary}`);
  if (evidenceSummary) contextParts.push(`Evidence/disclosure:\n${evidenceSummary}`);
  if (timelineSummary) contextParts.push(`Timeline:\n${timelineSummary}`);
  contextParts.push(`Relevant law (CPIA/disclosure):\n${lawBlock}`);

  const userContent = `Case context:\n${contextParts.join("\n\n")}\n\n---\nDraft a disclosure request the defence might send. Keep it concise and grounded in the context and law above.`;

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
        max_tokens: 800,
        temperature: 0.2,
      },
      { signal: controller.signal }
    );
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { ok: false, error: isAbort ? "Request timed out" : "Unable to generate" },
      { status: 502 }
    );
  }
  clearTimeout(timeoutId);

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  const text = raw.slice(0, MAX_TEXT_LENGTH);

  return NextResponse.json({ ok: true, text }, { status: 200 });
}
