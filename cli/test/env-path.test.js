import test from "node:test";
import assert from "node:assert/strict";
import { envPath } from "../src/lib/env.js";

test("envPath honors TIKTOK_CLI_ENV_PATH as an explicit override", () => {
  const original = process.env.TIKTOK_CLI_ENV_PATH;
  process.env.TIKTOK_CLI_ENV_PATH = "/tmp/somewhere/custom.env";
  try {
    assert.equal(envPath(), "/tmp/somewhere/custom.env");
  } finally {
    if (original === undefined) delete process.env.TIKTOK_CLI_ENV_PATH;
    else process.env.TIKTOK_CLI_ENV_PATH = original;
  }
});

test("envPath defaults to XDG_CONFIG_HOME/tiktok-cli/.env, not a repo-relative path", () => {
  const originalOverride = process.env.TIKTOK_CLI_ENV_PATH;
  const originalXdg = process.env.XDG_CONFIG_HOME;
  delete process.env.TIKTOK_CLI_ENV_PATH;
  process.env.XDG_CONFIG_HOME = "/tmp/fake-xdg-config";
  try {
    assert.equal(envPath(), "/tmp/fake-xdg-config/tiktok-cli/.env");
  } finally {
    if (originalOverride === undefined) delete process.env.TIKTOK_CLI_ENV_PATH;
    else process.env.TIKTOK_CLI_ENV_PATH = originalOverride;
    if (originalXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = originalXdg;
  }
});
