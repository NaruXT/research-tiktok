import test from "node:test";
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { mutate } from "../src/lib/mutate.js";
import { killswitchPath } from "../src/lib/paths.js";
import { isolate, stubFetch } from "./helpers.js";

test("killswitch blocks a T1 mutation before any network call", async () => {
  await isolate();
  await mkdir(join(killswitchPath(), ".."), { recursive: true });
  await writeFile(killswitchPath(), "stop");

  const fetchStub = stubFetch([{ body: { data: {}, error: { code: "ok" } } }]);
  try {
    await assert.rejects(
      () =>
        mutate(
          { isJson: true, flags: {} },
          { action: "test.action", trust: "T1", input: {}, preview: {} },
          async () => {
            throw new Error("fn should never run - killswitch must block first");
          }
        ),
      (err) => {
        assert.equal(err.code, "KILLSWITCH_ACTIVE");
        return true;
      }
    );
    assert.equal(fetchStub.calls.length, 0, "no network call should happen once killswitch is active");
  } finally {
    fetchStub.restore();
  }
});
