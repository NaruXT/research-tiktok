import { randomBytes } from "node:crypto";
import { requireAppCredential } from "../../lib/credentials.js";
import { atomicWrite } from "../../lib/atomic-write.js";
import { join } from "node:path";
import { stateDir } from "../../lib/paths.js";

const DEFAULT_SCOPES = "user.info.basic,video.list,video.upload,video.publish";

function statePath() {
  return join(stateDir(), "oauth-state.json");
}

export async function authLogin(ctx, { scope } = {}) {
  const clientKey = await requireAppCredential("TIKTOK_CLIENT_KEY");
  const redirectUri = await requireAppCredential("TIKTOK_REDIRECT_URI");
  const scopes = scope || DEFAULT_SCOPES;
  const state = randomBytes(16).toString("hex");

  await atomicWrite(statePath(), JSON.stringify({ state, createdAt: Date.now() }), {
    mode: 0o600,
  });

  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", clientKey);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return {
    data: { authorizeUrl: url.toString(), state, scope: scopes },
    human: () => {
      console.log("Open this URL, authorize, then copy the `code`/`state` from the callback page:\n");
      console.log(url.toString());
    },
    nextSteps: [
      "tiktok auth exchange --code <CODE> --state <STATE>",
    ],
  };
}

export async function readSavedState() {
  const { readFile } = await import("node:fs/promises");
  try {
    const text = await readFile(statePath(), "utf8");
    return JSON.parse(text).state;
  } catch {
    return null;
  }
}
