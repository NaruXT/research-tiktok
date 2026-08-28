import { tiktok } from "../../lib/http.js";
import { withAccessToken } from "../../lib/auth-retry.js";
import { printKeyValue } from "../../lib/human.js";

const FIELDS = "open_id,union_id,avatar_url,display_name";

export async function profileGet() {
  const res = await withAccessToken((token) => tiktok.userInfo(token, FIELDS));
  const user = res.data.user;
  return {
    data: user,
    human: () => printKeyValue(user),
  };
}
