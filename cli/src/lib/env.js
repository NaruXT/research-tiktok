import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { atomicWrite } from "./atomic-write.js";
import { AppError, Codes } from "./error-map.js";

// XDG config dir, same convention as stateDir() in paths.js (config vs state
// are deliberately separate XDG locations). No repo-relative resolution
// anymore - this is what makes the credential store portable to an
// `npm install -g` outside any particular repo. TIKTOK_CLI_ENV_PATH stays
// the explicit override for development.
function xdgConfigDir() {
  return process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
}

export function envPath() {
  return process.env.TIKTOK_CLI_ENV_PATH || join(xdgConfigDir(), "tiktok-cli", ".env");
}

function parseEnvFile(text) {
  const lines = text.split("\n");
  const values = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

let cache = null;

/** Load .env once per process, into process.env (existing env vars win). */
export async function loadEnv() {
  if (cache) return cache;
  const path = envPath();
  if (!existsSync(path)) {
    cache = {};
    return cache;
  }
  const text = await readFile(path, "utf8");
  const values = parseEnvFile(text);
  for (const [k, v] of Object.entries(values)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
  cache = values;
  return cache;
}

export async function requireEnv(key, hint) {
  await loadEnv();
  const value = process.env[key];
  if (!value) {
    throw new AppError(
      Codes.AUTH_MISSING,
      `Missing required credential: ${key}`,
      { hint: hint || `set ${key} in ${envPath()}` }
    );
  }
  return value;
}

/**
 * Update one or more keys in the .env file in place, preserving every other
 * line and its position. Atomic write so a crash mid-write can't corrupt it.
 * Per tiktok-auth-setup: a refreshed refresh_token can differ from the one
 * sent, and must always be persisted - this is the only writer of that.
 */
export async function persistEnv(updates) {
  const path = envPath();
  const text = existsSync(path) ? await readFile(path, "utf8") : "";
  const lines = text.split("\n");
  const seen = new Set();

  const nextLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return line;
    const key = trimmed.slice(0, eq).trim();
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      seen.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) nextLines.push(`${key}=${value}`);
  }

  await atomicWrite(path, nextLines.join("\n"), { mode: 0o600 });
  cache = null; // force re-read on next loadEnv()
  for (const [k, v] of Object.entries(updates)) process.env[k] = v;
}
