/**
 * POST /api/criminal/[caseId]/hearing-prep
 * Phase 5.5 / D2: Generate hearing prep (flat text + structured: say, ask, challenge, request, disclosure to push, risks, fallbacks).
 * Body: { hearingType?, planSummary?, evidenceSummary?, timelineSummary?, outstandingDisclosure? }.
 * Returns { ok, text, structured? }.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getOpenAIClient } from "@/lib/openai";
import { retrieveLawChunks } from "@/lib/criminal/criminal-law-corpus";
import type { CriminalHearingPrepStructured } from "@/lib/types/casebrain";

type RouteParams = { params: Promise<{ caseId: string }> };

const AI_TIMEOUT_MS = 35_000;
const MAX_TEXT_LENGTH = 2500;

const STRUCTURED_SYSTEM = `You are assisting a criminal defence solicitor in England & Wales. Your task is to produce a STRUCTURED hearing preparation output.

Use ONLY the case context provided (plan, evidence, timeline, outstanding disclosure) and the procedure/law provided.

You MUST respond with valid JSON only, no other text. Use this exact shape (all keys, arrays of strings; use [] if nothing for that category):
{
  "whatToSay": ["short point to say or submit at the hearing"],
  "whatToAsk": ["question to ask the court or prosecution"],
  "whatToChallenge": ["point to challenge or oppose"],
  "whatToRequest": ["formal request (e.g. adjournment, disclosure, order)"],
  "disclosureToPush": ["disclosure item to press for or mention"],
  "risksToFlag": ["risk or concern to flag to the court or note"],
  "fallbacks": ["fallback if X happens / plan B"]
}

Be concise. One short phrase per item. Do not invent facts. Do not give legal advice. The solicitor must verify and adapt.`;

function parseStructured(raw: string): CriminalHearingPrepStructured | null {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : trimmed;
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const arr = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 12) : [];
    return {
      whatToSay: arr(parsed.whatToSay),
      whatToAsk: arr(parsed.whatToAsk),
      whatToChallenge: arr(parsed.whatToChallenge),
      whatToRequest: arr(parsed.whatToRequest),
      disclosureToPush: arr(parsed.disclosureToPush),
      risksToFlag: arr(parsed.risksToFlag),
      fallbacks: arr(parsed.fallbacks),
    };
  } catch {
    return null;
  }
}

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
    outstandingDisclosure?: string[];
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
  const outstandingDisclosure = Array.isArray(body.outstandingDisclosure)
    ? body.outstandingDisclosure.filter((x): x is string => typeof x === "string").slice(0, 20)
    : [];

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
  if (outstandingDisclosure.length > 0) {
    contextParts.push(`Outstanding disclosure (from Safety): ${outstandingDisclosure.join("; ")}`);
  }
  contextParts.push(`Relevant law:\n${lawBlock}`);

  const userContent = `Case context:\n${contextParts.join("\n\n")}\n\n---\nProduce a structured hearing prep for ${hearingType}. Reply with JSON only (whatToSay, whatToAsk, whatToChallenge, whatToRequest, disclosureToPush, risksToFlag, fallbacks).`;

  const openai = getOpenAIClient();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let completion;
  try {
    completion = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: STRUCTURED_SYSTEM },
          { role: "user", content: userContent },
        ],
        max_tokens: 1200,
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
  const structured = parseStructured(raw);
  const text = raw.slice(0, MAX_TEXT_LENGTH);

  return NextResponse.json({
    ok: true,
    text,
    ...(structured ? { structured } : {}),
  }, { status: 200 });
}
