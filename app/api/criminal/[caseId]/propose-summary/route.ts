/**
 * POST /api/criminal/[caseId]/propose-summary
 * B4: Chat as case builder — generate a proposed case theory line and agreed summary (detailed).
 * Returns structured proposal so client can show Agree / Edit / Reject.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getOpenAIClient } from "@/lib/openai";
import { getChangeListForContext } from "@/lib/criminal/verdict-change-list";

type RouteParams = { params: Promise<{ caseId: string }> };

const AI_TIMEOUT_MS = 30_000;
const MAX_PLAN = 2000;
const MAX_EVIDENCE = 1500;
const MAX_TIMELINE = 600;

const PROMPT = `You are assisting a criminal defence solicitor in England & Wales. Using ONLY the Defence Plan and evidence/timeline context provided (and any "User feedback / change list" if present — address those points where relevant), produce:
1) A one-sentence case theory line (format: "Prosecution say X; we say Y; best angle Z."). Be specific to this case.
2) A 2–3 paragraph agreed case summary (detailed) that the solicitor can use as the canonical case narrative for strategy and chat. Use the plan's stance, defence angles, and evidence context. Do not invent facts not implied by the plan and evidence.

Output your response as JSON only, no other text. Use this exact shape:
{"caseTheoryLine": "one sentence here", "agreedSummaryDetailed": "paragraph one...\\n\\nparagraph two...\\n\\nparagraph three..."}

If you cannot produce a sensible proposal from the context, return: {"caseTheoryLine": "", "agreedSummaryDetailed": ""}`;

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

  const planSummary = typeof body.planSummary === "string" ? body.planSummary.slice(0, MAX_PLAN) : "";
  const evidenceSummary = typeof body.evidenceSummary === "string" ? body.evidenceSummary.slice(0, MAX_EVIDENCE) : "";
  const timelineSummary = typeof body.timelineSummary === "string" ? body.timelineSummary.slice(0, MAX_TIMELINE) : "";

  const changeList = await getChangeListForContext(supabase, caseId, orgId);
  const userContent = [
    changeList,
    planSummary && `Defence Plan:\n${planSummary}`,
    evidenceSummary && `Evidence/disclosure:\n${evidenceSummary}`,
    timelineSummary && `Timeline:\n${timelineSummary}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const openai = getOpenAIClient();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let raw: string;
  try {
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: userContent || "No context provided. Produce a minimal placeholder proposal." },
        ],
        max_tokens: 800,
        temperature: 0.3,
      },
      { signal: controller.signal }
    );
    raw = completion.choices[0]?.message?.content?.trim() ?? "";
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { ok: false, error: isAbort ? "Request timed out" : "Unable to generate proposal" },
      { status: 502 }
    );
  }
  clearTimeout(timeoutId);

  let proposal: { caseTheoryLine?: string; agreedSummaryDetailed?: string } = {};
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as { caseTheoryLine?: string; agreedSummaryDetailed?: string };
      proposal = {
        caseTheoryLine: typeof parsed.caseTheoryLine === "string" ? parsed.caseTheoryLine.trim() : undefined,
        agreedSummaryDetailed: typeof parsed.agreedSummaryDetailed === "string" ? parsed.agreedSummaryDetailed.trim() : undefined,
      };
    } catch {
      // leave proposal empty
    }
  }

  const reply =
    proposal.caseTheoryLine || proposal.agreedSummaryDetailed
      ? "Here’s a proposed case theory and agreed summary. Use Agree to save, Edit to change first, or Reject to discard."
      : "I couldn’t produce a structured proposal from the context. Try adding more in the Defence Plan or evidence.";

  return NextResponse.json({
    ok: true,
    reply,
    proposal: proposal.caseTheoryLine || proposal.agreedSummaryDetailed ? proposal : undefined,
  });
}
