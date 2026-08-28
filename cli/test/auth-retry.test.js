import test from "node:test";
import assert from "node:assert/strict";
import { withAccessToken } from "../src/lib/auth-retry.js";
import { requireAppCredential } from "../src/lib/credentials.js";
import { AppError, Codes } from "../src/lib/error-map.js";
import { isolate, stubFetch } from "./helpers.js";

function invalidTokenError() {
  const err = new AppError(Codes.API_ERROR, "expired");
  err.tiktokCode = "access_token_invalid";
  return err;
}

const REFRESH_OK = {
  body: { access_token: "new-token", refresh_token: "new-refresh", scope: "video.list", expires_in: 86400 },
};
const REFRESH_DEAD = {
  status: 400,
  body: { error: "invalid_grant", error_description: "refresh_token expired", log_id: "y" },
};

test("withAccessToken retries once after a silent refresh on access_token_invalid", async () => {
  await isolate();
  process.env.TIKTOK_ACCESS_TOKEN = "stale-token";
  process.env.TIKTOK_CLIENT_KEY = "ck";
  process.env.TIKTOK_CLIENT_SECRET = "cs";
  process.env.TIKTOK_REFRESH_TOKEN = "rt";

  const fetchStub = stubFetch([REFRESH_OK]);
  const seenTokens = [];
  try {
    const result = await withAccessToken(async (token) => {
      seenTokens.push(token);
      if (token === "stale-token") throw invalidTokenError();
      return { tokenUsed: token };
    });
    assert.equal(result.tokenUsed, "new-token");
    assert.deepEqual(seenTokens, ["stale-token", "new-token"]);
    assert.equal(process.env.TIKTOK_ACCESS_TOKEN, "new-token");
    assert.equal(fetchStub.calls.length, 1, "exactly one refresh call, no extra network calls");
  } finally {
    fetchStub.restore();
  }
});

test("withAccessToken surfaces AUTH_EXPIRED when the refresh_token itself is dead", async () => {
  await isolate();
  process.env.TIKTOK_ACCESS_TOKEN = "stale-token";
  process.env.TIKTOK_CLIENT_KEY = "ck";
  process.env.TIKTOK_CLIENT_SECRET = "cs";
  process.env.TIKTOK_REFRESH_TOKEN = "dead-rt";

  const fetchStub = stubFetch([REFRESH_DEAD]);
  try {
    await assert.rejects(
      () => withAccessToken(async () => { throw invalidTokenError(); }),
      (err) => {
        assert.equal(err.code, "AUTH_EXPIRED");
        assert.match(err.hint, /auth login/);
        return true;
      }
    );
  } finally {
    fetchStub.restore();
  }
});

test("withAccessToken does not retry on unrelated errors", async () => {
  await isolate();
  process.env.TIKTOK_ACCESS_TOKEN = "token";
  const fetchStub = stubFetch([]);
  try {
    await assert.rejects(
      () => withAccessToken(async () => { throw new AppError(Codes.RATE_LIMITED, "slow down"); }),
      (err) => {
        assert.equal(err.code, "RATE_LIMITED");
        return true;
      }
    );
    assert.equal(fetchStub.calls.length, 0, "no refresh attempt for a non-token error");
  } finally {
    fetchStub.restore();
  }
});

test("requireAppCredential returns the env value directly when already set, no prompt", async () => {
  await isolate();
  process.env.TIKTOK_CLIENT_KEY = "already-set";
  const value = await requireAppCredential("TIKTOK_CLIENT_KEY");
  assert.equal(value, "already-set");
});

test("requireAppCredential falls back to AUTH_MISSING when non-interactive and unset", async () => {
  await isolate();
  delete process.env.TIKTOK_CLIENT_KEY;
  // node --test's stdin is not a real TTY, so this exercises the
  // non-interactive fallback without needing to fake a terminal.
  await assert.rejects(
    () => requireAppCredential("TIKTOK_CLIENT_KEY"),
    (err) => {
      assert.equal(err.code, "AUTH_MISSING");
      return true;
    }
  );
});
