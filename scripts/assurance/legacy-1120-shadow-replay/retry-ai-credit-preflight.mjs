#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split("=");
    return [key.replace(/^--/, ""), rest.join("=")];
  }),
);

const envFile = resolve(String(args.get("env-file") ?? "C:/Users/gduff/casebrain-hub/.env.local"));
const outputPath = resolve(String(args.get("output") ?? "artifacts/ai-credit-preflight.json"));
for (const line of (await readFile(envFile, "utf8")).split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match || match[1] in process.env) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  process.env[match[1]] = value;
}

const apiKey = process.env.OPENAI_API_KEY?.trim();
if (!apiKey) throw new Error("OPENAI_API_KEY is unavailable");
const requestedModel = process.env.OPENAI_EXTRACTION_MODEL?.trim() || "gpt-4o-mini";

const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: requestedModel,
    messages: [{ role: "user", content: "Reply only OK" }],
    max_tokens: 2,
    temperature: 0,
  }),
});

let responseBody = {};
try {
  responseBody = await response.json();
} catch {
  responseBody = { error: { type: "unparseable_response" } };
}

const receipt = {
  schemaVersion: "casebrain-ai-credit-preflight@1.0.0",
  attemptedAt: new Date().toISOString(),
  ok: response.ok,
  httpStatus: response.status,
  requestedModel,
  modelReturned: typeof responseBody?.model === "string" ? responseBody.model : null,
  errorCode: typeof responseBody?.error?.code === "string" ? responseBody.error.code : null,
  errorCategory:
    typeof responseBody?.error?.type === "string" ? responseBody.error.type : response.ok ? null : "unknown_error",
  secretRecorded: false,
  responseContentRecorded: false,
  fundedReplayAllowed: response.ok,
  isolatedPersistenceAllowed: response.ok,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify(receipt));
