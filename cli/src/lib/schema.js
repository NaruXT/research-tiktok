// Static schema, hand-maintained next to the commands it describes. Kept
// deliberately small (9 commands) rather than generated from a validation
// layer - there's no validation library in this project to generate from,
// and hand-maintenance is honest about that instead of pretending otherwise.
export const SCHEMA_VERSION = "1.0.0";

export const COMMANDS = {
  "auth login": {
    trust: "T0",
    flags: { scope: "string (optional, comma-separated)" },
    output: { authorizeUrl: "string", state: "string", scope: "string" },
  },
  "auth exchange": {
    trust: "T1",
    flags: { code: "string (required)", state: "string (optional, CSRF check)" },
    output: { scope: "string", expires_in: "number", open_id: "string" },
  },
  "auth refresh": {
    trust: "T1",
    flags: {},
    output: { scope: "string", expires_in: "number" },
  },
  "auth revoke": {
    trust: "T2",
    flags: {},
    output: { revoked: "boolean" },
  },
  "profile get": {
    trust: "T0",
    flags: {},
    output: { open_id: "string", union_id: "string", avatar_url: "string", display_name: "string" },
  },
  "video list": {
    trust: "T0",
    flags: { "max-count": "number (optional, max 20)", cursor: "number (optional)" },
    output: { videos: "array", cursor: "number", has_more: "boolean" },
  },
  "video get": {
    trust: "T0",
    flags: { ids: "string (required, comma-separated, max 20)" },
    output: { videos: "array", requested: "number", returned: "number" },
  },
  "creator info": {
    trust: "T0",
    flags: {},
    output: { creator_username: "string", privacy_level_options: "string[]", max_video_post_duration_sec: "number" },
  },
  "post upload": {
    trust: "T1",
    flags: { file: "string path (required)" },
    output: { publish_id: "string" },
    note: "sends to the account's TikTok inbox as a draft, not published",
  },
  "post direct": {
    trust: "T2",
    flags: {
      file: "string path (required)",
      caption: "string, max 2200 UTF-16 units (required)",
      "disable-comment": "boolean",
      "disable-duet": "boolean",
      "disable-stitch": "boolean",
    },
    output: { publish_id: "string" },
    note: "privacy_level is always SELF_ONLY, hardcoded, not a flag - see .loop/HANDOFF.md guardrail",
  },
  "post status": {
    trust: "T0",
    flags: { "publish-id": "string (required)", wait: "boolean, poll until terminal status" },
    output: { status: "string", fail_reason: "string (if FAILED)" },
  },
};
