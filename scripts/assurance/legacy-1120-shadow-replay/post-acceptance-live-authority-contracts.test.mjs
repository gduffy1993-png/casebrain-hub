#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(
  "artifacts/casebrain-qa/assurance/master-auditor-v2/legacy-1120-shadow-replay/post-acceptance-live-authority",
);
const authenticated = JSON.parse(await readFile(resolve(root, "authenticated-preview-smoke.json"), "utf8"));
const ai = JSON.parse(await readFile(resolve(root, "ai-credit-preflight-retry.json"), "utf8"));
const authSource = await readFile(
  resolve("scripts/assurance/legacy-1120-shadow-replay/run-authenticated-preview-smoke.mjs"),
  "utf8",
);

let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  process.stdout.write(`PASS ${name}\n`);
};

test("authenticated preview session succeeded", () => assert.equal(authenticated.authenticated, true));
test("QA case population was read without mutation", () => {
  assert.equal(authenticated.caseList.count, 10);
  assert.equal(authenticated.aggregate.casesChecked, 10);
  assert.equal(authenticated.sourceMutationAttempted, false);
  assert.equal(authenticated.qaWorkspaceOnly, true);
});
test("every read-only case endpoint returned 2xx", () => {
  assert.equal(authenticated.aggregate.endpointChecks, 50);
  assert.equal(authenticated.aggregate.endpoint2xx, 50);
  assert.equal(authenticated.aggregate.endpointNon2xx, 0);
  assert.equal(authenticated.aggregate.endpointRedirectedToSignIn, 0);
});
test("workspace entitlement is scoped and active", () => {
  assert.equal(authenticated.trial.isBlocked, false);
  assert.equal(authenticated.trial.casesUsed, 10);
  assert.equal(authenticated.trial.casesLimit, 25);
  assert.equal(authenticated.trial.docsUsed, 10);
  assert.equal(authenticated.trial.docsLimit, 100);
});
test("session secrets were not persisted", () => {
  assert.equal(authenticated.sessionSecretsPersisted, false);
  const serialised = JSON.stringify(authenticated).toLowerCase();
  for (const forbidden of ["access_token", "refresh_token", "set-cookie", "authorization", "password", "cookie:"]) {
    assert.equal(serialised.includes(forbidden), false, `receipt contains ${forbidden}`);
  }
});
test("QA credentials are environment-only", () => {
  assert.equal(authSource.includes("gduffy1993+casebrain"), false);
  assert.equal(/CASEBRAIN_QA_PASSWORD\s*=\s*["'][^"']+/.test(authSource), false);
});
test("funded AI lane fails closed on quota exhaustion", () => {
  assert.equal(ai.ok, false);
  assert.equal(ai.httpStatus, 429);
  assert.equal(ai.errorCode, "credit_balance_exhausted");
  assert.equal(ai.fundedReplayAllowed, false);
  assert.equal(ai.isolatedPersistenceAllowed, false);
  assert.equal(ai.secretRecorded, false);
});

process.stdout.write(`${passed}/${passed} contracts passed\n`);
