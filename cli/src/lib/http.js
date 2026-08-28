import { AppError, Codes } from "./error-map.js";

const BASE = "https://open.tiktokapis.com";

/**
 * /v2/oauth/* uses {error, error_description, log_id} at the root.
 * Every other endpoint used by this CLI uses {data, error:{code,message,log_id}}
 * with error.code === "ok" meaning success - see tiktok-display-api SKILL.md
 * "Manejo de errores": the error field is always present, don't treat its
 * presence alone as failure.
 */
function mapError(status, body) {
  if (status === 429) {
    return new AppError(Codes.RATE_LIMITED, "TikTok API rate limit exceeded.", {
      hint: "wait a moment and retry",
    });
  }
  if (body?.error_description) {
    const err = new AppError(
      Codes.API_ERROR,
      body.error_description,
      { hint: `TikTok error: ${body.error} (log_id ${body.log_id ?? "n/a"})` }
    );
    err.tiktokCode = body.error; // e.g. "invalid_grant" - a dead refresh_token
    return err;
  }
  if (body?.error && body.error.code && body.error.code !== "ok") {
    const err = new AppError(Codes.API_ERROR, body.error.message || body.error.code, {
      hint: `TikTok error code ${body.error.code} (log_id ${body.error.log_id ?? "n/a"})`,
    });
    err.tiktokCode = body.error.code; // e.g. "access_token_invalid"
    return err;
  }
  return new AppError(Codes.API_ERROR, `TikTok API returned HTTP ${status}`, {
    hint: JSON.stringify(body).slice(0, 300),
  });
}

async function request(path, { method = "GET", token, form, json, headers = {} } = {}) {
  const init = { method, headers: { ...headers } };

  if (form) {
    init.headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = new URLSearchParams(form).toString();
  } else if (json !== undefined) {
    init.headers["Content-Type"] = "application/json; charset=UTF-8";
    init.body = JSON.stringify(json);
  }
  if (token) init.headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  const ok =
    res.ok &&
    !body.error_description &&
    !(body.error && body.error.code && body.error.code !== "ok");

  if (!ok) throw mapError(res.status, body);
  return body;
}

export const tiktok = {
  oauthToken: (form) => request("/v2/oauth/token/", { method: "POST", form }),
  oauthRevoke: (form) => request("/v2/oauth/revoke/", { method: "POST", form }),
  userInfo: (token, fields) =>
    request(`/v2/user/info/?fields=${encodeURIComponent(fields)}`, { token }),
  videoList: (token, body) =>
    request("/v2/video/list/?fields=id,title,cover_image_url,share_url,view_count,like_count", {
      method: "POST",
      token,
      json: body,
    }),
  videoQuery: (token, body) =>
    request(
      "/v2/video/query/?fields=id,title,cover_image_url,share_url,view_count,like_count",
      { method: "POST", token, json: body }
    ),
  creatorInfo: (token) =>
    request("/v2/post/publish/creator_info/query/", { method: "POST", token }),
  postDirectInit: (token, body) =>
    request("/v2/post/publish/video/init/", { method: "POST", token, json: body }),
  postUploadInit: (token, body) =>
    request("/v2/post/publish/inbox/video/init/", { method: "POST", token, json: body }),
  postStatus: (token, publishId) =>
    request("/v2/post/publish/status/fetch/", {
      method: "POST",
      token,
      json: { publish_id: publishId },
    }),
};

/** PUT the file bytes to the upload_url returned by init - not a /v2 path, full URL. */
export async function putVideoFile(uploadUrl, buffer, contentRange) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Range": contentRange, "Content-Type": "video/mp4" },
    body: buffer,
  });
  if (!res.ok) {
    throw new AppError(
      Codes.API_ERROR,
      `Video upload PUT failed with HTTP ${res.status}`,
      { hint: await res.text().catch(() => "") }
    );
  }
}
