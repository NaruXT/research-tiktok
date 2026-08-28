import test from "node:test";
import assert from "node:assert/strict";
import { schemaCommand } from "../src/commands/schema.js";

test("schema with no args lists every command with its trust tier", async () => {
  const result = await schemaCommand({}, []);
  assert.equal(result.data.version, "1.0.0");
  assert.ok(result.data.commands.length >= 9);
  for (const row of result.data.commands) {
    assert.match(row.trust, /^T[0-2]$/);
  }
});

test("schema post direct returns the hardcoded-privacy_level note", async () => {
  const result = await schemaCommand({}, ["post", "direct"]);
  assert.equal(result.data.trust, "T2");
  assert.match(result.data.note, /SELF_ONLY/);
});

test("schema unknown-command throws with a hint", async () => {
  await assert.rejects(
    () => schemaCommand({}, ["not", "real"]),
    (err) => {
      assert.equal(err.code, "UNKNOWN_COMMAND");
      assert.ok(err.hint);
      return true;
    }
  );
});
