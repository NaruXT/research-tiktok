import { tiktok } from "../../lib/http.js";
import { withAccessToken } from "../../lib/auth-retry.js";
import { AppError, Codes } from "../../lib/error-map.js";
import { printTable } from "../../lib/human.js";

export async function videoGet(ctx, { ids } = {}) {
  if (!ids) {
    throw new AppError(Codes.VALIDATION_ERROR, "--ids is required (comma-separated video ids)", {
      hint: "tiktok video get --ids 7077642457847991554,7080217258529737986",
    });
  }
  const videoIds = ids.split(",").map((s) => s.trim()).filter(Boolean);
  if (videoIds.length > 20) {
    throw new AppError(Codes.VALIDATION_ERROR, "max 20 video ids per request");
  }

  const res = await withAccessToken((token) =>
    tiktok.videoQuery(token, { filters: { video_ids: videoIds } })
  );
  const videos = res.data.videos || [];

  return {
    data: { videos, requested: videoIds.length, returned: videos.length },
    human: () => {
      printTable(videos, ["id", "title", "view_count", "like_count", "share_url"]);
      if (videos.length < videoIds.length) {
        // Confirmed in the project's own E2E evidence: an unknown id is
        // silently omitted, not an error - surface that gap explicitly.
        console.log(
          `\n${videoIds.length - videos.length} id(s) returned nothing (unknown/inaccessible, not an API error).`
        );
      }
    },
  };
}
