import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { atomicAppend } from "./atomic-write.js";
import { stateDir } from "./paths.js";

const SECRET_KEYS = new Set([
  "client_secret",
  "access_token",
  "refresh_token",
  "authorization",
]);

function redact(obj) {
  if (obj == null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEYS.has(k.toLowerCase())) {
      out[k] = "<REDACTED>";
    } else if (typeof v === "object") {
      out[k] = redact(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function dayBucketPath() {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return join(stateDir(), "audit", `${day}.jsonl`);
}

/**
 * Two-phase write: call before the network request with the intended action,
 * then again with the same id once it settles. If the process dies mid-flight
 * the "pending" record is still on disk instead of silence.
 */
export async function auditPending(action, input) {
  const id = randomUUID();
  const line = JSON.stringify({
    id,
    ts: new Date().toISOString(),
    phase: "pending",
    action,
    input: redact(input),
  }) + "\n";
  await atomicAppend(dayBucketPath(), line);
  return id;
}

export async function auditSettled(id, action, { ok, output, error }) {
  const line = JSON.stringify({
    id,
    ts: new Date().toISOString(),
    phase: "settled",
    action,
    ok,
    ...(output !== undefined ? { output: redact(output) } : {}),
    ...(error !== undefined ? { error: redact(error) } : {}),
  }) + "\n";
  await atomicAppend(dayBucketPath(), line);
}
