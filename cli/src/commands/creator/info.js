import { tiktok } from "../../lib/http.js";
import { withAccessToken } from "../../lib/auth-retry.js";
import { printKeyValue } from "../../lib/human.js";

export async function creatorInfo() {
  const res = await withAccessToken((token) => tiktok.creatorInfo(token));
  const data = res.data;
  return {
    data,
    human: () => printKeyValue(data),
    nextSteps: data.privacy_level_options?.includes("SELF_ONLY")
      ? ["tiktok post direct --file <video.mp4> --caption <text>"]
      : [],
  };
}
