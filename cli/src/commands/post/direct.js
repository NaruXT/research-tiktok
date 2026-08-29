import { tiktok, putVideoFile } from "../../lib/http.js";
import { withAccessToken } from "../../lib/auth-retry.js";
import { mutate } from "../../lib/mutate.js";
import { loadVideoFile } from "../../lib/video-file.js";
import { printDryRun } from "../../lib/human.js";
import { AppError, Codes } from "../../lib/error-map.js";

// Irreversibility guardrail (see .loop/HANDOFF.md § Guardarraíles de
// irreversibilidad, enforced project-wide by .loop/verify.sh): this constant
// is the only privacy_level this CLI will ever send on Direct Post. It is a
// literal, never derived from a flag, env var, or any other input, so no
// override anywhere in the call chain can change it.
const PRIVACY_LEVEL = "SELF_ONLY";

export async function postDirect(ctx, { file, caption, disableComment, disableDuet, disableStitch } = {}) {
  if (!file) {
    throw new AppError(Codes.VALIDATION_ERROR, "--file is required", {
      hint: "tiktok post direct --file ./video.mp4 --caption \"...\"",
    });
  }
  if (!caption) {
    throw new AppError(Codes.VALIDATION_ERROR, "--caption is required");
  }
  if (caption.length > 2200) {
    throw new AppError(Codes.VALIDATION_ERROR, "caption exceeds 2200 UTF-16 code units");
  }

  // Guardrail, defense in depth: refuse before sending anything if this
  // creator's account doesn't actually offer SELF_ONLY, rather than letting
  // TikTok reject a request we already know is wrong.
  const creator = await withAccessToken((token) => tiktok.creatorInfo(token));
  if (!creator.data.privacy_level_options?.includes(PRIVACY_LEVEL)) {
    throw new AppError(
      Codes.VALIDATION_ERROR,
      `This creator's account does not offer privacy_level "${PRIVACY_LEVEL}" - refusing to post.`,
      { hint: "run `tiktok creator info` to see what this account actually allows" }
    );
  }

  const video = await loadVideoFile(file);
  const postInfo = {
    title: caption,
    privacy_level: PRIVACY_LEVEL,
    disable_comment: !!disableComment,
    disable_duet: !!disableDuet,
    disable_stitch: !!disableStitch,
  };

  const output = await mutate(
    ctx,
    {
      action: "post.direct",
      trust: "T2",
      input: { file, caption, video_size: video.size },
      preview: { post_info: postInfo, source_info: video.sourceInfo },
    },
    async () => {
      try {
        const init = await withAccessToken((token) =>
          tiktok.postDirectInit(token, { post_info: postInfo, source_info: video.sourceInfo })
        );
        await putVideoFile(init.data.upload_url, video.buffer, video.contentRange);
        return { publish_id: init.data.publish_id };
      } catch (err) {
        if (err.tiktokCode === "unaudited_client_can_only_post_to_private_accounts") {
          err.hint =
            "known TikTok platform behavior, not a bug here: unaudited Sandbox apps are blocked " +
            "server-side from Direct Post even with SELF_ONLY, unless the target TikTok account " +
            "itself is set to private. `tiktok post upload` (draft) works regardless.";
        }
        throw err;
      }
    }
  );

  if (output.dryRun) {
    return { data: output, human: () => printDryRun(output.wouldSend) };
  }

  return {
    data: output,
    human: () => console.log(`Posted (SELF_ONLY). publish_id: ${output.publish_id}`),
    nextSteps: [`tiktok post status --publish-id ${output.publish_id}${ctx.flags.wait ? " --wait" : ""}`],
  };
}
