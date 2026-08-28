---
name: tiktok-cli
description: Drive the tiktok CLI (auth, profile/video display, content posting) over this repo's tested TikTok Skills - JSON envelope, trust tiers, and safe workflows for publishing.
---

## What this is

`tiktok` is a local, source-only CLI wrapping the API sequence this repo's Skills already tested end-to-end: OAuth login -> Display API -> Content Posting API. It talks to the real TikTok API using credentials in this repo's `.env`. Install/run: `cd cli && npm link`, then `tiktok <noun> <verb>`.

## Output contract

Non-TTY (any pipe, or explicitly `--json`) emits one JSON line on stdout:

```json
{"ok": true, "data": {...}, "meta": {...}}
{"ok": false, "error": {"code": "...", "message": "...", "hint": "..."}}
```

`hint` on an error is a real next step, not a suggestion to read `--help`. `meta`/stderr may carry `nextSteps`: an array of literal next commands to run.

Interactive TTY without `--json` prints a human table/key-value view instead. Force either with `--human` / `--json`.

## Commands and trust tiers

Run `tiktok schema` for the full live list (`tiktok schema <noun> <verb>` for one command's flags/output shape - this is the source of truth, safer than trusting this file if the two ever drift).

| Tier | Meaning |
|---|---|
| T0 | Read-only. Runs immediately, no gate. |
| T1 | Writes, but low/no external visibility (drafts, token refresh). Logged to the audit log, no confirmation. |
| T2 | Externally visible or hard-to-undo. Requires `--yes`, or an interactive y/N if run from a real terminal. In JSON/piped mode with no `--yes`, throws `CONFIRMATION_REQUIRED` instead of hanging on a prompt. |

`auth revoke` and `post direct` are T2. Everything else is T0/T1.

## The guardrail that never moves

`post direct` always sends `privacy_level: "SELF_ONLY"`. It is a literal constant in `src/commands/post/direct.js`, not a flag, env var, or anything else settable from outside - there is no way to make this CLI post publicly. Before sending anything it also calls `creator info` and refuses if `SELF_ONLY` isn't actually in that account's `privacy_level_options`. This mirrors the project-wide irreversibility guardrail in `../../.loop/HANDOFF.md`.

Known project finding this CLI surfaces automatically: unaudited Sandbox apps can get `unaudited_client_can_only_post_to_private_accounts` on Direct Post even with `SELF_ONLY`, if the target TikTok account itself is public. `post upload` (draft to inbox) is unaffected and always works regardless of the account's own privacy setting.

## Safe workflows

**Preview before publishing** (never skips the real read calls, only the mutating one):
```
tiktok post direct --file ./video.mp4 --caption "..." --dry-run
```
Returns `data.wouldSend` - exactly the `post_info`/`source_info` that would be sent, including the hardcoded `privacy_level`.

**Publish for real** (needs `--yes` outside a real terminal):
```
tiktok creator info                                    # confirm SELF_ONLY is offered
tiktok post direct --file ./video.mp4 --caption "..." --yes
tiktok post status --publish-id <id> --wait             # poll to a terminal status
```

**Draft instead of publishing** (T1, no `--yes` needed):
```
tiktok post upload --file ./video.mp4
```

**Emergency stop**: `touch ~/.local/state/tiktok-cli/KILLSWITCH` blocks every T1/T2 write immediately, independent of any flag. Remove the file to resume.

## Auth lifecycle

```
tiktok auth login                                # prints an authorize URL + state
# open it, authorize, copy code/state from the callback page
tiktok auth exchange --code <CODE> --state <STATE>
```

You should not need to run `auth refresh` yourself. Every command that calls the API (`profile get`, `video list/get`, `creator info`, `post upload/direct/status`) goes through `withAccessToken`: on `access_token_invalid` it silently refreshes using the stored `refresh_token` (no prompt, no browser - the refresh_token is meant to last 365 days) and retries the original call once. `auth refresh` still exists for running it explicitly. If the refresh_token itself is also dead (`invalid_grant` from TikTok - happens sooner than 365 days on Sandbox apps in practice, see the case in `.loop/HANDOFF.md`), every path converges on the same `AUTH_EXPIRED` error telling you to run `auth login`.

Tokens persist to this repo's `.env` (atomic write, same file every other Skill/script in this repo already reads). `auth exchange` checks the `--state` you pass against the one `auth login` generated and refuses on mismatch (CSRF check).

**First-time setup**: `TIKTOK_CLIENT_KEY`/`TIKTOK_CLIENT_SECRET`/`TIKTOK_REDIRECT_URI` (the one-time app-registration credentials, not the OAuth tokens) are prompted for automatically, inline, the first time any `auth` command needs one that's missing from `.env` - `client_secret` is read without echoing to the screen. This only happens in a real interactive terminal; in JSON/piped/agent contexts it still fails fast with `AUTH_MISSING` rather than hanging on a prompt nobody will answer. `access_token`/`refresh_token` are deliberately never prompted for - they only come from completing `auth login` in a browser.

## Errors worth knowing

- `AUTH_MISSING` - a required `.env` credential isn't set, and either the terminal isn't interactive or the value was left empty at the prompt. Hint names which one.
- `AUTH_EXPIRED` - the access_token was invalid *and* the silent refresh also failed (the refresh_token is dead too). The only fix is `tiktok auth login`. If you only see `access_token_invalid` inside an `API_ERROR`, that's not this - it means the retry-with-a-fresh-token attempt is still in flight or the retry itself failed for a different reason; check the message.
- `CONFIRMATION_REQUIRED` - a T2 command needs `--yes` in non-interactive contexts.
- `KILLSWITCH_ACTIVE` - the sentinel file above is present.
- Unknown `video_ids` passed to `video get` are silently dropped by TikTok's API, not an error - compare `requested` vs. `returned` in the response.

## Tests

`npm test` (Node's built-in test runner, zero dependencies, 18 tests) covers the JSON envelope shape, the trust ladder's non-interactive throw, the killswitch blocking a write before any network call, the silent-refresh-and-retry path (success, and the dead-refresh_token terminal case), and - most load-bearing - that `post direct --dry-run` always produces `privacy_level: "SELF_ONLY"` and never reaches the real init/publish call.
