import { tiktok } from "../../lib/http.js";
import { withAccessToken } from "../../lib/auth-retry.js";
import { AppError, Codes } from "../../lib/error-map.js";
import { printKeyValue } from "../../lib/human.js";

const TERMINAL = new Set(["PUBLISH_COMPLETE", "SEND_TO_USER_INBOX", "FAILED"]);
const MAX_WAIT_MS = 5 * 60 * 1000;
const MAX_DELAY_MS = 15_000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * publish_id is a real credential-adjacent identifier owned by TikTok, not
 * by this CLI - status/fetch is itself the idempotent source of truth, so
 * --wait polls it directly instead of maintaining a separate job ledger.
 * Killing this process loses nothing: `tiktok post status --publish-id X
 * --wait` resumes exactly where it left off. See friction.md.
 */
export async function postStatus(ctx, { publishId } = {}) {
  if (!publishId) {
    throw new AppError(Codes.VALIDATION_ERROR, "--publish-id is required");
  }

  let delay = 3000;
  const deadline = Date.now() + MAX_WAIT_MS;
  let data;

  do {
    const res = await withAccessToken((token) => tiktok.postStatus(token, publishId));
    data = res.data;
    if (!ctx.flags.wait || TERMINAL.has(data.status)) break;
    if (!ctx.isJson) console.error(`status: ${data.status} - waiting ${delay / 1000}s...`);
    await sleep(delay);
    delay = Math.min(delay * 1.5, MAX_DELAY_MS);
  } while (Date.now() < deadline);

  return {
    data,
    human: () => printKeyValue(data),
    nextSteps: !TERMINAL.has(data.status)
      ? [`tiktok post status --publish-id ${publishId} --wait`]
      : [],
  };
}
