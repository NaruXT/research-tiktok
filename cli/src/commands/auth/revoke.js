import { requireEnv, persistEnv } from "../../lib/env.js";
import { requireAppCredential } from "../../lib/credentials.js";
import { tiktok } from "../../lib/http.js";
import { mutate } from "../../lib/mutate.js";
import { printDryRun } from "../../lib/human.js";

export async function authRevoke(ctx) {
  const clientKey = await requireAppCredential("TIKTOK_CLIENT_KEY");
  const clientSecret = await requireAppCredential("TIKTOK_CLIENT_SECRET", { secret: true });
  const accessToken = await requireEnv("TIKTOK_ACCESS_TOKEN");

  const output = await mutate(
    ctx,
    {
      action: "auth.revoke",
      // T2: kills the live session for real; undoing it means a full
      // `auth login` round-trip through the browser, not a retry.
      trust: "T2",
      input: {},
      preview: {
        action: "revoke the current access_token",
        consequence: "requires a full `tiktok auth login` to restore access",
      },
    },
    async () => {
      await tiktok.oauthRevoke({
        client_key: clientKey,
        client_secret: clientSecret,
        token: accessToken,
      });
      await persistEnv({ TIKTOK_ACCESS_TOKEN: "", TIKTOK_REFRESH_TOKEN: "" });
      return { revoked: true };
    }
  );

  if (output.dryRun) {
    return { data: output, human: () => printDryRun(output.wouldSend) };
  }

  return {
    data: output,
    human: () => console.log("Token revoked. Run `tiktok auth login` to reauthorize."),
  };
}
