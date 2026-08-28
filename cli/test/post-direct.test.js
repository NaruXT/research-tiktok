import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { postDirect } from "../src/commands/post/direct.js";
import { isolate, stubFetch } from "./helpers.js";

async function makeVideoFile() {
  const path = join(tmpdir(), `tiktok-cli-test-${Date.now()}.mp4`);
  await writeFile(path, Buffer.from([0, 1, 2, 3]));
  return path;
}

const CREATOR_OK = {
  body: {
    data: { privacy_level_options: ["SELF_ONLY", "PUBLIC_TO_EVERYONE"], creator_username: "test" },
    error: { code: "ok" },
  },
};

test("post direct dry-run sends privacy_level SELF_ONLY and never calls init/PUT", async () => {
  await isolate();
  process.env.TIKTOK_ACCESS_TOKEN = "fake-token";
  const file = await makeVideoFile();
  const fetchStub = stubFetch([CREATOR_OK]);

  try {
    const ctx = { isJson: true, flags: { "dry-run": true } };
    const result = await postDirect(ctx, { file, caption: "prueba" });
    assert.equal(result.data.wouldSend.post_info.privacy_level, "SELF_ONLY");
    assert.equal(fetchStub.calls.length, 1, "only creator_info/query should be called, never init");
  } finally {
    fetchStub.restore();
  }
});

test("post direct without --yes in non-interactive mode is refused before publishing", async () => {
  await isolate();
  process.env.TIKTOK_ACCESS_TOKEN = "fake-token";
  const file = await makeVideoFile();
  const fetchStub = stubFetch([CREATOR_OK]);

  try {
    const ctx = { isJson: true, flags: {} };
    await assert.rejects(
      () => postDirect(ctx, { file, caption: "prueba" }),
      (err) => {
        assert.equal(err.code, "CONFIRMATION_REQUIRED");
        return true;
      }
    );
    assert.equal(fetchStub.calls.length, 1, "creator_info/query runs, but init must not");
  } finally {
    fetchStub.restore();
  }
});

test("post direct attaches the known-finding hint on unaudited_client_can_only_post_to_private_accounts", async () => {
  await isolate();
  process.env.TIKTOK_ACCESS_TOKEN = "fake-token";
  const file = await makeVideoFile();
  const fetchStub = stubFetch([
    CREATOR_OK,
    {
      status: 403,
      body: {
        data: {},
        error: {
          code: "unaudited_client_can_only_post_to_private_accounts",
          message: "Please review our integration guidelines",
          log_id: "x",
        },
      },
    },
  ]);

  try {
    const ctx = { isJson: true, flags: { yes: true } };
    await assert.rejects(
      () => postDirect(ctx, { file, caption: "prueba" }),
      (err) => {
        assert.equal(err.code, "API_ERROR");
        assert.match(err.hint, /post upload.*works/i);
        return true;
      }
    );
  } finally {
    fetchStub.restore();
  }
});

test("post direct refuses when the creator's account doesn't offer SELF_ONLY", async () => {
  await isolate();
  process.env.TIKTOK_ACCESS_TOKEN = "fake-token";
  const file = await makeVideoFile();
  const fetchStub = stubFetch([
    { body: { data: { privacy_level_options: ["PUBLIC_TO_EVERYONE"] }, error: { code: "ok" } } },
  ]);

  try {
    const ctx = { isJson: true, flags: { yes: true } };
    await assert.rejects(
      () => postDirect(ctx, { file, caption: "prueba" }),
      (err) => {
        assert.equal(err.code, "VALIDATION_ERROR");
        assert.match(err.message, /SELF_ONLY/);
        return true;
      }
    );
  } finally {
    fetchStub.restore();
  }
});
