import { tiktok } from "./http.js";
import { requireEnv, persistEnv } from "./env.js";
import { requireAppCredential } from "./credentials.js";
import { auditPending, auditSettled } from "./audit-log.js";
import { AppError, Codes } from "./error-map.js";

/**
 * Wraps any call that needs a valid access_token. access_token lasts 24h;
 * refresh_token lasts 365 days and needs no user interaction to use - so on
 * access_token_invalid, refresh silently with the stored refresh_token and
 * retry the caller's request once before giving up.
 */
export async function withAccessToken(fn) {
  const token = await requireEnv("TIKTOK_ACCESS_TOKEN", "run `tiktok auth login` first");
  try {
    return await fn(token);
  } catch (err) {
    if (err.tiktokCode !== "access_token_invalid") throw err;
    const fresh = await refreshSilently();
    return await fn(fresh);
  }
}

async function refreshSilently() {
  const clientKey = await requireAppCredential("TIKTOK_CLIENT_KEY");
  const clientSecret = await requireAppCredential("TIKTOK_CLIENT_SECRET", { secret: true });
  const refreshToken = await requireEnv("TIKTOK_REFRESH_TOKEN", "run `tiktok auth login` first");

  const id = await auditPending("auth.silent_refresh", {});
  try {
    const res = await tiktok.oauthToken({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    await persistEnv({
      TIKTOK_ACCESS_TOKEN: res.access_token,
      TIKTOK_REFRESH_TOKEN: res.refresh_token,
    });
    await auditSettled(id, "auth.silent_refresh", {
      ok: true,
      output: { expires_in: res.expires_in },
    });
    return res.access_token;
  } catch (err) {
    await auditSettled(id, "auth.silent_refresh", {
      ok: false,
      error: { message: err.message },
    });
    throw new AppError(
      Codes.AUTH_EXPIRED,
      "access_token expired and the stored refresh_token could not renew it.",
      { hint: "run `tiktok auth login` to reauthorize" }
    );
  }
}
