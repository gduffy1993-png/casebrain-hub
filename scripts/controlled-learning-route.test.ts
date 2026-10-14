/** Real route + original PDF extraction + local PostgreSQL, with auth/storage adapters. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { NextRequest } from "next/server";

import { createLearningHandlers } from "../lib/criminal/controlled-learning/handlers";
import { loadRulesFromDatabase } from "../lib/criminal/controlled-learning/registry";
const fixture = { db: null as any, role: "solicitor", userId: "reviewer-1", org: "10000000-0000-4000-8000-000000000001", files: new Map<string, Uint8Array>(), calls: 0 };
const { GET, POST } = createLearningHandlers({ authenticate: async () => ({ ok: true,
  context: { orgId: fixture.org, userId: fixture.userId, role: fixture.role } }), database: () => fixture.db,
  approvedRules: orgId => loadRulesFromDatabase(fixture.db, orgId) });
const tests: Array<{ name: string; run: () => Promise<void> }> = [];
let initialize: () => Promise<void>, cleanup: () => Promise<void>;
const beforeAll = (run: () => Promise<void>, _timeout?: number) => { initialize = run; };
const afterAll = (run: () => Promise<void>) => { cleanup = run; };
const it = (name: string, run: () => Promise<void>, _timeout?: number) => { tests.push({ name, run }); };
const describe = { sequential: (_name: string, run: () => void) => run() };
const expect = (value: any, message?: string) => ({ toBe: (expected: any) => assert.equal(value, expected, message),
  rejects: { toThrow: () => assert.rejects(value) } });

let pg: any;
class Query {
  conditions: Array<[string, unknown]> = []; payload: any = null; operation = "select"; max = 100; sort = "";
  constructor(public table: string) { if (!/^(learning_corrections|learning_lessons|learning_events|documents)$/.test(table)) throw new Error("Unexpected table"); }
  select(_columns = "*") { return this; }
  eq(key: string, value: unknown) { this.conditions.push([key, value]); return this; }
  insert(value: unknown) { this.payload = value; this.operation = "insert"; return this; }
  update(value: unknown) { this.payload = value; this.operation = "update"; return this; }
  limit(value: number) { this.max = value; return this; }
  order(key: string, options: { ascending: boolean }) { this.sort = ` order by "${key}" ${options.ascending ? "asc" : "desc"}`; return this; }
  async execute(single = false) {
    fixture.calls++;
    try {
      const params: unknown[] = [];
      const parameter = (value: unknown) => { params.push(value); return `$${params.length}`; };
      const values = this.payload ? Object.entries(this.payload) : [];
      let statement = `select * from ${this.table}`;
      if (this.operation === "insert") statement = `insert into ${this.table} (${values.map(([key]) => `"${key}"`).join(",")}) values (${values.map(([, value]) => parameter(value)).join(",")})`;
      if (this.operation === "update") statement = `update ${this.table} set ${values.map(([key, value]) => `"${key}"=${parameter(value)}`).join(",")}`;
      if (this.conditions.length) statement += ` where ${this.conditions.map(([key, value]) => `"${key}"=${parameter(value)}`).join(" and ")}`;
      statement += this.operation === "select" ? `${this.sort} limit ${this.max}` : " returning *";
      const result = await pg.query(statement, params);
      return { data: single ? result.rows[0] ?? null : result.rows, error: null };
    } catch (error) { return { data: null, error: { message: String(error) } }; }
  }
  single() { return this.execute(true); }
  maybeSingle() { return this.execute(true); }
  then(resolve: any, reject: any) { return this.execute().then(resolve, reject); }
}
const request = (body: unknown) => new NextRequest("http://localhost/api/criminal/learning", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
const act = async (body: unknown) => { const response = await POST(request(body)); return { status: response.status, body: await response.json() }; };
const documents: Array<{ id: string; name: string }> = [];
let trainingId = "", lessonId = ""; const testIds: string[] = [];

beforeAll(async () => {
  const runtime = process.env.LEARNING_TEST_RUNTIME || process.cwd();
  const require = createRequire(path.join(runtime, "package.json"));
  const { PGlite } = require("@electric-sql/pglite"); pg = new PGlite();
  await pg.exec("create role anon; create role authenticated; create role service_role; create table cases(id uuid primary key); create table documents(id uuid primary key,org_id uuid,case_id uuid,name text,storage_url text);");
  await pg.exec(fs.readFileSync(path.resolve("supabase/migrations/20261014120000_controlled_learning.sql"), "utf8"));
  process.env.CASEBRAIN_CONTROLLED_LEARNING = "1";
  fixture.db = {
    from: (table: string) => new Query(table),
    storage: { from: () => ({ download: async (key: string) => ({ data: fixture.files.has(key) ? new Blob([fixture.files.get(key)!]) : null, error: null }) }) },
    rpc: async (name: string, params: any) => {
      try { const revoke = name === "revoke_learning_lesson";
        const result = await pg.query(revoke ? "select revoke_learning_lesson($1,$2,$3) as approved" : "select approve_learning_lesson($1,$2,$3,$4,$5) as approved",
        revoke ? [params.p_org, params.p_id, params.p_actor] : [params.p_org, params.p_id, params.p_actor, params.p_evaluation, params.p_version]); return { data: result.rows[0].approved, error: null }; }
      catch (error) { return { data: null, error: { message: String(error) } }; }
    },
  };
  for (let index = 0; index < 6; index++) {
    const caseId = randomUUID(), id = randomUUID(); const name = `Person ${["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"][index]}`;
    const bytes = execFileSync(process.env.LEARNING_TEST_PYTHON || "python", ["scripts/generate-learning-fixture.py", name, String(index)]);
    const key = `${fixture.org}/${caseId}/${id}.pdf`;
    fixture.files.set(key, bytes); documents.push({ id, name });
    await pg.query("insert into cases values ($1)", [caseId]);
    await pg.query("insert into documents values ($1,$2,$3,$4,$5)", [id, fixture.org, caseId, "source.pdf", key]);
  }
}, 30000);
afterAll(async () => { await pg?.close(); delete process.env.CASEBRAIN_CONTROLLED_LEARNING; });

describe.sequential("controlled learning authenticated workflow", () => {
  it("denies non-reviewer writes before touching storage", async () => {
    fixture.role = "viewer"; const calls = fixture.calls;
    expect((await act({ action: "capture" })).status).toBe(403); expect(fixture.calls).toBe(calls); fixture.role = "solicitor";
  });
  it("rejects another organisation's source document", async () => {
    const originalOrg = fixture.org; fixture.org = randomUUID();
    expect((await act({ action: "capture", documentId: documents[0].id, page: 1, rule: { field: "defendant", label: "Defendant named" }, expectedValue: documents[0].name })).status).toBe(400);
    fixture.org = originalOrg;
  });
  it("captures and verifies six different original PDFs", async () => {
    for (let index = 0; index < documents.length; index++) {
      fixture.userId = "reviewer-1";
      const result = await act({ action: "capture", documentId: documents[index].id,
        rule: { field: "defendant", label: "Defendant named" }, expectedValue: documents[index].name, page: index % 2 === 1 ? 2 : 1 });
      expect(result.status, JSON.stringify(result.body)).toBe(200);
      const id = result.body.correction.id;
      expect((await act({ action: "verify", correctionId: id, confirmed: true })).status).toBe(400);
      fixture.userId = "reviewer-2";
      expect((await act({ action: "verify", correctionId: id, confirmed: true })).status).toBe(200);
      if (index === 0) trainingId = id; else testIds.push(id);
    }
  }, 30000);
  it("does not accept expected answers unsupported by the selected PDF", async () => {
    expect((await act({ action: "capture", documentId: documents[0].id, page: 1,
      rule: { field: "defendant", label: "Defendant named" }, expectedValue: "Someone Else" })).status).toBe(400);
  });
  it("creates a proposal that cannot be approved before evaluation", async () => {
    const result = await act({ action: "propose", correctionId: trainingId }); expect(result.status).toBe(200); lessonId = result.body.lesson.id;
    expect((await act({ action: "approve", lessonId })).status).toBe(400);
  });
  it("blocks evaluation on its own training source", async () => {
    const result = await act({ action: "evaluate", lessonId, testIds: [trainingId, ...testIds.slice(0, 4)] });
    expect(result.status, JSON.stringify(result.body)).toBe(200); expect(result.body.report.eligible).toBe(false);
  }, 30000);
  it("improves five held-out original PDFs with expected answers isolated to scoring", async () => {
    const result = await act({ action: "evaluate", lessonId, testIds });
    expect(result.status, JSON.stringify(result.body)).toBe(200);
    expect(result.body.report.eligible, JSON.stringify(result.body.report)).toBe(true);
    expect(result.body.report.improvements).toBe(5); expect(result.body.report.regressions).toBe(0);
  }, 30000);
  it("requires separate approval and records an audit event", async () => {
    fixture.userId = "reviewer-1";
    expect((await act({ action: "approve", lessonId })).status).toBe(400);
    fixture.userId = "reviewer-2";
    expect((await act({ action: "approve", lessonId })).status).toBe(400);
    fixture.userId = "reviewer-3";
    const result = await act({ action: "approve", lessonId }); expect(result.status, JSON.stringify(result.body)).toBe(200);
    const events = await pg.query("select * from learning_events where lesson_id=$1 and action='approved'", [lessonId]); expect(events.rows[0].action).toBe("approved");
    const response = await GET(new NextRequest("http://localhost/api/criminal/learning")); expect((await response.json()).lessons[0].status).toBe("approved");
  }, 30000);
  it("can revoke the rule without deleting the evidence", async () => {
    expect((await act({ action: "revoke", lessonId })).status).toBe(200);
    const response = await GET(new NextRequest("http://localhost/api/criminal/learning")); const data = await response.json();
    expect(data.lessons[0].status).toBe("revoked"); expect(data.corrections.length).toBe(6);
  });
  it("SQL approval rejects forged eligibility with regressions or a stale baseline", async () => {
    const proposal = await act({ action: "propose", correctionId: testIds[0] }); expect(proposal.status).toBe(200);
    const newId = proposal.body.lesson.id;
    const version = "field-label-learning-v1-paged-reader";
    const forged = { pipelineVersion: version, eligible: true, tested: 5, improvements: 5, regressions: 1, failures: 0, baselineLessonIds: [] };
    const regression = await fixture.db.rpc("approve_learning_lesson", { p_org: fixture.org, p_id: newId, p_actor: "reviewer-1", p_evaluation: forged, p_version: version });
    expect(regression.data).toBe(false);
    const stale = await fixture.db.rpc("approve_learning_lesson", { p_org: fixture.org, p_id: newId, p_actor: "reviewer-1", p_evaluation: { ...forged, regressions: 0, baselineLessonIds: [randomUUID()] }, p_version: version });
    expect(stale.data).toBe(false);
    const missingVersion = await fixture.db.rpc("approve_learning_lesson", { p_org: fixture.org, p_id: newId, p_actor: "reviewer-1", p_evaluation: { ...forged, pipelineVersion: null, regressions: 0 }, p_version: version });
    expect(missingVersion.data).toBe(false);
  });
  it("leaves table access closed to direct authenticated clients", async () => {
    await pg.exec("set role authenticated");
    await expect(pg.query("select * from learning_lessons")).rejects.toThrow(); await pg.exec("reset role");
  });
});
async function main() {
  try {
    await initialize!();
    for (const test of tests) { await test.run(); console.log(`PASS ${test.name}`); }
    console.log(`${tests.length} route/database/original-PDF checks passed.`);
  } finally { await cleanup!(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
