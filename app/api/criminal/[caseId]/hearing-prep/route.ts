/**
 * POST /api/criminal/[caseId]/hearing-prep
 * Phase 5.5: Generate a hearing prep checklist (PTPH, trial, case management, etc.).
 * Body: { hearingType?, planSummary?, evidenceSummary?, timelineSummary? }. Returns { ok, text }.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getOpenAIClient } from "@/lib/openai";
import { retrieveLawChunks } from "@/lib/criminal/criminal-law-corpus";

type RouteParams = { params: Promise<{ caseId: string }> };

const AI_TIMEOUT_MS = 25_000;
const MAX_TEXT_LENGTH = 2500;

const SYSTEM_PROMPT = `You are assisting a criminal defence solicitor in England & Wales. Your task is to produce a concise hearing preparation checklist.

Use ONLY:
1) The case context provided (plan, evidence, timeline).
2) The procedure and law provided (allocation, bail, case management, disclosure).

Output a clear checklist: bullet points or numbered list. Cover:
- Disclosure and evidence (what to chase, what to have ready).
- Key dates and next steps.
- Matters to raise at this hearing type (e.g. for PTPH: allocation, disclosure, bail; for trial: witnesses, exhibits, legal issues).
Do not invent facts. Do not give legal advice. If the law chunks mention case names or authorities, cite them where relevant. The solicitor must verify and adapt.`;

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

  let body: {
    hearingType?: string;
    planSummary?: string;
    evidenceSummary?: string;
    timelineSummary?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const hearingType = typeof body.hearingType === "string" ? body.hearingType.trim() || "PTPH" : "PTPH";
  const planSummary = typeof body.planSummary === "string" ? body.planSummary.slice(0, 2000) : "";
  const evidenceSummary = typeof body.evidenceSummary === "string" ? body.evidenceSummary.slice(0, 1500) : "";
  const timelineSummary = typeof body.timelineSummary === "string" ? body.timelineSummary.slice(0, 800) : "";

  const lawChunks = await retrieveLawChunks(
    `hearing preparation ${hearingType} allocation bail case management disclosure procedure checklist`,
    6
  );
  const lawBlock =
    lawChunks.length > 0
      ? lawChunks.map((c) => `[${c.source}] ${c.title}\n${c.content_text}`).join("\n\n---\n\n")
      : "(No law chunks retrieved.)";

  const contextParts: string[] = [];
  contextParts.push(`Hearing type: ${hearingType}`);
  if (planSummary) contextParts.push(`Defence Plan:\n${planSummary}`);
  if (evidenceSummary) contextParts.push(`Evidence/disclosure:\n${evidenceSummary}`);
  if (timelineSummary) contextParts.push(`Timeline:\n${timelineSummary}`);
  contextParts.push(`Relevant law:\n${lawBlock}`);

  const userContent = `Case context:\n${contextParts.join("\n\n")}\n\n---\nProduce a hearing preparation checklist for ${hearingType}. Be concise and practical.`;

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
        max_tokens: 900,
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
