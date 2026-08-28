import { stdin, stdout } from "node:process";
import { requireEnv, persistEnv } from "./env.js";
import { promptVisible, promptSecret } from "./prompt-secret.js";

const LABELS = {
  TIKTOK_CLIENT_KEY: "TikTok client_key",
  TIKTOK_CLIENT_SECRET: "TikTok client_secret",
  TIKTOK_REDIRECT_URI: "TikTok redirect_uri",
};

/**
 * Only for the three app-registration credentials (client_key, client_secret,
 * redirect_uri) - set once when the app is registered in the Developer
 * Portal, and reasonable for a human to type in from that portal's screen.
 * access_token/refresh_token are deliberately NOT handled here: they only
 * come from completing the OAuth browser flow (`tiktok auth login`), typing
 * them in wouldn't make sense.
 *
 * If the value is missing and this is a real interactive terminal, ask for
 * it once and persist to .env so it's never asked again. In any
 * non-interactive context (piped, --json, an agent), this still throws
 * AUTH_MISSING exactly as before - a prompt in that context would hang
 * forever instead of failing cleanly.
 */
export async function requireAppCredential(key, { secret = false } = {}) {
  try {
    return await requireEnv(key);
  } catch (err) {
    const interactive = stdin.isTTY && stdout.isTTY;
    if (!interactive) throw err;

    const label = LABELS[key] || key;
    stdout.write(`\n${label} isn't set in .env yet (only needed once, per app registration).\n`);
    const value = secret ? await promptSecret(`${label}: `) : await promptVisible(`${label}: `);

    if (!value) throw err;

    await persistEnv({ [key]: value });
    return value;
  }
}
