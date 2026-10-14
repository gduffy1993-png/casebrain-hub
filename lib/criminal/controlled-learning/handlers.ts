import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LEARNING_VERSION, RuleSchema, evaluateObservations, matchLabelRule, normalizeValue, type ApprovedRule, type EvaluationObservation } from "@/lib/criminal/controlled-learning/core";
import { extractMetadataWithLessons, metadataValue } from "@/lib/criminal/controlled-learning/extract";
import { readOwnedOriginalPdf, sourceHash } from "@/lib/criminal/controlled-learning/original-pdf";

const uuid = z.string().uuid();

async function recordLearningEvent(
  db: SupabaseClient,
  orgId: string,
  actorId: string,
  action: string,
  lessonId: string | null,
  payload: Record<string, unknown> = {},
) {
  const { error } = await db.from("learning_events").insert({
    org_id: orgId,
    lesson_id: lessonId,
    actor_id: actorId,
    action,
    payload,
  });
  if (error) throw new Error("Learning audit event could not be stored.");
}

async function sampleHeldOutCorrectionIds(
  db: SupabaseClient,
  orgId: string,
  field: string,
  trainingId: string,
): Promise<string[]> {
  const { data, error } = await db
    .from("learning_corrections")
    .select("id,verified_at")
    .eq("org_id", orgId)
    .eq("field", field)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error || !data) throw new Error("Held-out examples could not be loaded.");
  const ids = data
    .filter((row) => row.id !== trainingId && row.verified_at)
    .map((row) => row.id)
    .slice(0, 12);
  if (ids.length < 5) throw new Error("Five verified held-out examples of this field are required.");
  return ids;
}

const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("capture"), documentId: uuid, page: z.number().int().min(1).max(2000),
    rule: RuleSchema, expectedValue: z.string().trim().min(2).max(320) }).strict(),
  z.object({ action: z.literal("verify"), correctionId: uuid, confirmed: z.literal(true) }).strict(),
  z.object({ action: z.literal("propose"), correctionId: uuid }).strict(),
  z.object({ action: z.literal("evaluate"), lessonId: uuid, testIds: z.array(uuid).min(5).max(12) }).strict(),
  z.object({ action: z.literal("approve"), lessonId: uuid }).strict(),
  z.object({ action: z.literal("revoke"), lessonId: uuid }).strict(),
]);

export function createLearningHandlers(dependencies: {
  authenticate: () => Promise<{ ok: true; context: { orgId: string; userId: string; role: string } } | { ok: false; response: NextResponse }>;
  database: () => SupabaseClient;
  approvedRules: (orgId: string) => Promise<{ rules: ApprovedRule[]; status: "ready" | "disabled" | "unavailable" }>;
}) {
const requireAuthContextApi = dependencies.authenticate;
const getSupabaseAdminClient = dependencies.database;
const loadApprovedRules = dependencies.approvedRules;
async function GET(request: NextRequest) {
  const auth = await requireAuthContextApi(); if (!auth.ok) return auth.response;
  const { orgId, role } = auth.context;
  const active = await loadApprovedRules(orgId);
  if (!["owner", "solicitor"].includes(role)) return NextResponse.json({ status: active.status, canReview: false, corrections: [], lessons: [] });
  if (active.status !== "ready") return NextResponse.json({ status: active.status, canReview: true, corrections: [], lessons: [] });
  const db = getSupabaseAdminClient();
  const [corrections, lessons] = await Promise.all([
    db.from("learning_corrections").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(100),
    db.from("learning_lessons").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(100),
  ]);
  if (corrections.error || lessons.error) return NextResponse.json({ error: "Learning records could not be loaded." }, { status: 503 });
  return NextResponse.json({ status: "ready", canReview: true, corrections: corrections.data, lessons: lessons.data });
}

async function POST(request: NextRequest) {
  const auth = await requireAuthContextApi(); if (!auth.ok) return auth.response;
  const { orgId, role, userId } = auth.context;
  if (!["owner", "solicitor"].includes(role)) return NextResponse.json({ error: "A solicitor or organisation owner must review learning changes." }, { status: 403 });
  if (process.env.CASEBRAIN_CONTROLLED_LEARNING !== "1") return NextResponse.json({ error: "Controlled learning is not enabled." }, { status: 503 });
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid learning request.", details: parsed.error.flatten() }, { status: 400 });
  const body = parsed.data;
  const db = getSupabaseAdminClient();
  try {
    if (body.action === "capture") {
      const source = await readOwnedOriginalPdf(db, orgId, body.documentId);
      const page = source.pages.find(p => p.compiledPage === body.page);
      if (!page) throw new Error("Source page not found.");
      const matches = matchLabelRule(page.text, body.rule);
      const match = matches.find(m => normalizeValue(m.value) === normalizeValue(body.expectedValue));
      if (!match) throw new Error("The value must match an explicit labelled row on the selected original PDF page.");
      const { data, error } = await db.from("learning_corrections").insert({ org_id: orgId, case_id: source.document.case_id,
        document_id: body.documentId, field: body.rule.field, label: body.rule.label, expected_value: match.value,
        source_page: body.page, source_line: match.line, source_hash: source.hash, created_by: userId }).select().single();
      if (error) throw new Error("Correction could not be stored.");
      await recordLearningEvent(db, orgId, userId, "captured", null, { correctionId: data.id, documentId: body.documentId });
      return NextResponse.json({ correction: data });
    }
    if (body.action === "verify" || body.action === "propose") {
      const { data: correction } = await db.from("learning_corrections").select("*").eq("org_id", orgId).eq("id", body.correctionId).maybeSingle();
      if (!correction) return NextResponse.json({ error: "Correction not found." }, { status: 404 });
      const source = await readOwnedOriginalPdf(db, orgId, correction.document_id);
      if (source.hash !== correction.source_hash) throw new Error("The source changed. Capture the correction again.");
      if (body.action === "verify") {
        if (correction.created_by === userId) throw new Error("A different reviewer must verify this correction.");
        const { error } = await db.from("learning_corrections").update({ verified_by: userId, verified_at: new Date().toISOString() }).eq("id", correction.id).eq("org_id", orgId);
        if (error) throw new Error("Verification could not be stored.");
        await recordLearningEvent(db, orgId, userId, "verified", null, { correctionId: correction.id });
        return NextResponse.json({ verified: true });
      }
      if (!correction.verified_at) throw new Error("A source correction must be verified before proposing a rule.");
      const { data, error } = await db.from("learning_lessons").insert({ org_id: orgId, correction_id: correction.id, field: correction.field, label: correction.label }).select().single();
      if (error) throw new Error("Rule could not be proposed (a proposal may already exist).");
      await recordLearningEvent(db, orgId, userId, "proposed", data.id, { correctionId: correction.id });
      return NextResponse.json({ lesson: data });
    }
    const { data: lesson } = await db.from("learning_lessons").select("*").eq("id", body.lessonId).eq("org_id", orgId).maybeSingle();
    if (!lesson) return NextResponse.json({ error: "Rule not found." }, { status: 404 });
    if (body.action === "revoke") {
      const { data: revoked, error } = await db.rpc("revoke_learning_lesson", { p_org: orgId, p_id: lesson.id, p_actor: userId });
      if (error || revoked !== true) throw new Error("Approved rule could not be revoked.");
      return NextResponse.json({ revoked: true });
    }
    if (lesson.status !== "proposed") throw new Error("Only proposed rules can be evaluated or approved.");
    const rule = RuleSchema.parse({ field: lesson.field, label: lesson.label });
    const { data: training } = await db.from("learning_corrections").select("*").eq("org_id", orgId).eq("id", lesson.correction_id).maybeSingle();
    if (!training?.verified_at) throw new Error("Training correction is no longer verified.");
    if (body.action === "approve" && (training.created_by === userId || training.verified_by === userId)) {
      throw new Error("A different reviewer must approve this rule.");
    }
    const testIds: string[] = body.action === "evaluate"
      ? body.testIds
      : await sampleHeldOutCorrectionIds(db, orgId, rule.field, training.id);
    if (testIds.length < 5 || testIds.length > 12 || new Set(testIds).size !== testIds.length) throw new Error("Select five to twelve distinct verified held-out examples.");
    const trainingSource = await readOwnedOriginalPdf(db, orgId, training.document_id);
    if (trainingSource.hash !== training.source_hash) throw new Error("Training PDF changed.");
    const active = await loadApprovedRules(orgId);
    if (active.status !== "ready") throw new Error("Approved rules could not be loaded.");
    const baselineRules = active.rules.filter(r => r.id !== lesson.id);
    const candidate: ApprovedRule = { ...rule, id: lesson.id, status: "approved", pipelineVersion: LEARNING_VERSION };
    const observations: EvaluationObservation[] = [];
    // Expected values stay here in the scorer. Neither extractor receives them.
    for (const id of testIds) {
      const { data: test } = await db.from("learning_corrections").select("*").eq("org_id", orgId).eq("field", rule.field).eq("id", id).maybeSingle();
      if (!test?.verified_at) throw new Error("All tests must be verified examples of the same field.");
      const source = await readOwnedOriginalPdf(db, orgId, test.document_id);
      if (source.hash !== test.source_hash) throw new Error("A test PDF changed. Re-verify its correction.");
      const testPage = source.pages.find(page => page.compiledPage === test.source_page);
      if (!testPage || !matchLabelRule(testPage.text, { field: test.field, label: test.label }).some(match => normalizeValue(match.value) === normalizeValue(test.expected_value))) {
        throw new Error("The original test PDF no longer supports its verified correction. Reprocessing or review is required.");
      }
      const baseline = extractMetadataWithLessons(source.text, baselineRules);
      const proposed = extractMetadataWithLessons(source.text, [...baselineRules, candidate]);
      observations.push({ id: test.id, sourceHash: source.hash, sourceCaseId: test.case_id, originalPdf: true,
        expected: test.expected_value, baseline: metadataValue(baseline.metadata, rule.field), candidate: metadataValue(proposed.metadata, rule.field) });
    }
    const baselineKey = sourceHash(JSON.stringify(baselineRules.slice().sort((a, b) => a.id.localeCompare(b.id))));
    const report = { ...evaluateObservations(rule, observations, { sourceHash: training.source_hash, caseId: training.case_id }, baselineKey),
      baselineLessonIds: baselineRules.map(r => r.id).sort() };
    if (body.action === "evaluate") {
      const { error } = await db.from("learning_lessons").update({ evaluation: report, updated_at: new Date().toISOString() }).eq("id", lesson.id).eq("org_id", orgId).eq("status", "proposed");
      if (error) throw new Error("Evaluation could not be stored.");
      await recordLearningEvent(db, orgId, userId, "evaluated", lesson.id, { sampled: false, tested: report.tested });
      return NextResponse.json({ report });
    }
    // Approval re-extracts originals and reruns the evaluation; browser reports are never trusted.
    if (!report.eligible) return NextResponse.json({ error: "The rule did not meet the approval gate.", report }, { status: 409 });
    const { data: approved, error } = await db.rpc("approve_learning_lesson", { p_org: orgId, p_id: lesson.id, p_actor: userId, p_evaluation: report, p_version: LEARNING_VERSION });
    if (error || approved !== true) throw new Error("Approval could not be completed.");
    return NextResponse.json({ approved: true, report });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Learning request failed." }, { status: 400 });
  }
}

return { GET, POST };
}
