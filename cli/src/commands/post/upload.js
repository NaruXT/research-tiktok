import { tiktok, putVideoFile } from "../../lib/http.js";
import { withAccessToken } from "../../lib/auth-retry.js";
import { mutate } from "../../lib/mutate.js";
import { loadVideoFile } from "../../lib/video-file.js";
import { printDryRun } from "../../lib/human.js";
import { AppError, Codes } from "../../lib/error-map.js";

/**
 * Upload API - sends to the user's TikTok inbox as a draft. They finish and
 * publish it manually inside the app. Nothing becomes visible to anyone
 * until the account owner acts on it, which is why this is T1 (logged, not
 * gated) rather than T2 like `post direct`.
 */
export async function postUpload(ctx, { file } = {}) {
  if (!file) {
    throw new AppError(Codes.VALIDATION_ERROR, "--file is required", {
      hint: "tiktok post upload --file ./video.mp4",
    });
  }

  const video = await loadVideoFile(file);

  const output = await mutate(
    ctx,
    {
      action: "post.upload",
      trust: "T1",
      input: { file, video_size: video.size },
      preview: { source_info: video.sourceInfo },
    },
    async () => {
      const init = await withAccessToken((token) =>
        tiktok.postUploadInit(token, { source_info: video.sourceInfo })
      );
      await putVideoFile(init.data.upload_url, video.buffer, video.contentRange);
      return { publish_id: init.data.publish_id };
    }
  );

  if (output.dryRun) {
    return { data: output, human: () => printDryRun(output.wouldSend) };
  }

  return {
    data: output,
    human: () => console.log(`Draft uploaded. publish_id: ${output.publish_id}`),
    nextSteps: [`tiktok post status --publish-id ${output.publish_id}${ctx.flags.wait ? " --wait" : ""}`],
  };
}
