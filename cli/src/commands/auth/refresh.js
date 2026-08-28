import { requireEnv, persistEnv } from "../../lib/env.js";
import { requireAppCredential } from "../../lib/credentials.js";
import { tiktok } from "../../lib/http.js";
import { mutate } from "../../lib/mutate.js";
import { printDryRun } from "../../lib/human.js";

export async function authRefresh(ctx) {
  const clientKey = await requireAppCredential("TIKTOK_CLIENT_KEY");
  const clientSecret = await requireAppCredential("TIKTOK_CLIENT_SECRET", { secret: true });
  const refreshToken = await requireEnv("TIKTOK_REFRESH_TOKEN", "run `tiktok auth login` first");

  const output = await mutate(
    ctx,
    {
      action: "auth.refresh",
      trust: "T1",
      input: {},
      preview: { action: "refresh access token using stored refresh_token" },
    },
    async () => {
      const res = await tiktok.oauthToken({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });
      // Per tiktok-auth-setup: the returned refresh_token may differ from the
      // one sent - always persist the new one, never assume it's unchanged.
      await persistEnv({
        TIKTOK_ACCESS_TOKEN: res.access_token,
        TIKTOK_REFRESH_TOKEN: res.refresh_token,
      });
      return { scope: res.scope, expires_in: res.expires_in };
    }
  );

  if (output.dryRun) {
    return { data: output, human: () => printDryRun(output.wouldSend) };
  }

  return {
    data: output,
    human: () => console.log(`Refreshed. New access_token expires in ${output.expires_in}s.`),
  };
}
