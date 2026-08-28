import { requireEnv, persistEnv } from "../../lib/env.js";
import { requireAppCredential } from "../../lib/credentials.js";
import { tiktok } from "../../lib/http.js";
import { mutate } from "../../lib/mutate.js";
import { AppError, Codes } from "../../lib/error-map.js";
import { readSavedState } from "./login.js";
import { printDryRun } from "../../lib/human.js";

export async function authExchange(ctx, { code, state }) {
  if (!code) {
    throw new AppError(Codes.VALIDATION_ERROR, "--code is required", {
      hint: "run `tiktok auth login` first, then paste the code from the callback page",
    });
  }

  const savedState = await readSavedState();
  if (savedState && state && savedState !== state) {
    throw new AppError(
      Codes.VALIDATION_ERROR,
      "state mismatch - this code was not issued for the last `tiktok auth login` call",
      { hint: "run `tiktok auth login` again and use the state it prints" }
    );
  }

  const clientKey = await requireAppCredential("TIKTOK_CLIENT_KEY");
  const clientSecret = await requireAppCredential("TIKTOK_CLIENT_SECRET", { secret: true });
  const redirectUri = await requireAppCredential("TIKTOK_REDIRECT_URI");

  const output = await mutate(
    ctx,
    {
      action: "auth.exchange",
      trust: "T1",
      input: { code: "<REDACTED>" },
      preview: { action: "exchange authorization code for tokens" },
    },
    async () => {
      const res = await tiktok.oauthToken({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      });
      await persistEnv({
        TIKTOK_ACCESS_TOKEN: res.access_token,
        TIKTOK_REFRESH_TOKEN: res.refresh_token,
      });
      return { scope: res.scope, expires_in: res.expires_in, open_id: res.open_id };
    }
  );

  if (output.dryRun) {
    return { data: output, human: () => printDryRun(output.wouldSend) };
  }

  return {
    data: output,
    human: () => {
      console.log("Authorized. Tokens saved to .env.");
      console.log(`scope: ${output.scope}`);
    },
    nextSteps: ["tiktok profile get"],
  };
}
