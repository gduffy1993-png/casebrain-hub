/* eslint-disable no-console */

const WORKER_NAME = "inbox";

console.log(`[worker:${WORKER_NAME}] Worker started at ${new Date().toISOString()}`);

setInterval(() => {
  console.log(`[worker:${WORKER_NAME}] Heartbeat ${new Date().toISOString()}`);
}, 60_000);

process.on("SIGINT", () => {
  console.log(`[worker:${WORKER_NAME}] Received SIGINT. Shutting down.`);
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log(`[worker:${WORKER_NAME}] Received SIGTERM. Shutting down.`);
  process.exit(0);
});

export {};
