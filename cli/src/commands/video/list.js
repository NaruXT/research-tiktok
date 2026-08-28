import { tiktok } from "../../lib/http.js";
import { withAccessToken } from "../../lib/auth-retry.js";
import { printTable } from "../../lib/human.js";

export async function videoList(ctx, { maxCount, cursor } = {}) {
  const body = {};
  if (maxCount) body.max_count = Number(maxCount);
  if (cursor) body.cursor = Number(cursor);

  const res = await withAccessToken((token) => tiktok.videoList(token, body));
  const videos = res.data.videos || [];

  return {
    data: { videos, cursor: res.data.cursor, has_more: res.data.has_more },
    human: () =>
      printTable(videos, ["id", "title", "view_count", "like_count", "share_url"]),
    nextSteps:
      res.data.has_more && res.data.cursor
        ? [`tiktok video list --cursor ${res.data.cursor}`]
        : [],
  };
}
