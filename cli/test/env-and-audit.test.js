import test from "node:test";
import assert from "node:assert/strict";
import { writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { isolate } from "./helpers.js";

test("persistEnv rewrites only the targeted keys, preserving everything else", async () => {
  const dir = await isolate();
  const envFile = join(dir, "test.env");
  process.env.TIKTOK_CLI_ENV_PATH = envFile;
  await writeFile(
    envFile,
    "# comment\nTIKTOK_CLIENT_KEY=abc\nTIKTOK_ACCESS_TOKEN=old\nTIKTOK_REFRESH_TOKEN=oldref\n"
  );

  const { persistEnv } = await import("../src/lib/env.js?t=" + Date.now());
  await persistEnv({ TIKTOK_ACCESS_TOKEN: "new", TIKTOK_REFRESH_TOKEN: "newref" });

  const text = await readFile(envFile, "utf8");
  assert.match(text, /# comment/);
  assert.match(text, /TIKTOK_CLIENT_KEY=abc/);
  assert.match(text, /TIKTOK_ACCESS_TOKEN=new/);
  assert.match(text, /TIKTOK_REFRESH_TOKEN=newref/);
  assert.doesNotMatch(text, /=old(?!ref)/);
});

test("audit log redacts secrets and writes a pending record before settling", async () => {
  const dir = await isolate();
  const { auditPending, auditSettled } = await import("../src/lib/audit-log.js?t=" + Date.now());

  const id = await auditPending("test.action", { client_secret: "supersecret", note: "ok" });

  const day = new Date().toISOString().slice(0, 10);
  const auditFile = join(dir, "tiktok-cli", "audit", `${day}.jsonl`);
  let lines = (await readFile(auditFile, "utf8")).trim().split("\n");
  assert.equal(lines.length, 1);
  const pending = JSON.parse(lines[0]);
  assert.equal(pending.phase, "pending");
  assert.equal(pending.input.client_secret, "<REDACTED>");
  assert.equal(pending.input.note, "ok");

  await auditSettled(id, "test.action", { ok: true, output: { access_token: "abc123" } });
  lines = (await readFile(auditFile, "utf8")).trim().split("\n");
  assert.equal(lines.length, 2);
  const settled = JSON.parse(lines[1]);
  assert.equal(settled.id, id);
  assert.equal(settled.output.access_token, "<REDACTED>");
});
