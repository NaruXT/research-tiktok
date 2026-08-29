---
name: tiktok-cli
description: Drive the tiktok CLI (auth, profile/video display, content posting) over TikTok's own Login Kit, Display, and Content Posting APIs - JSON envelope, trust tiers, and safe workflows for publishing.
---

## What this is

`tiktok` is a CLI wrapping TikTok's official OAuth login -> Display API -> Content Posting API sequence. It talks to the real TikTok API using your own TikTok Developer App's credentials - it does not ship or share anyone else's app.

Install: `npm install -g tiktok-cli` (or run ad hoc with `npx tiktok-cli`). Zero runtime dependencies. Then `tiktok <noun> <verb>`.

## Before you start: bring your own TikTok Developer App

This CLI is not a TikTok app itself - it's a client. You need your own app registered at `developers.tiktok.com` (Sandbox mode is enough to start: Login Kit + Content Posting API products, a redirect URI you control). That gives you a `client_key`, `client_secret`, and the `redirect_uri` you registered.

You don't need to set these up manually: the first time any `auth` command needs one that's missing, the CLI asks for it right there in the terminal (`client_secret` is read without echoing to the screen) and saves it for next time. This only happens in a real interactive terminal - in a script, pipe, or agent context it fails fast with `AUTH_MISSING` instead of hanging on a prompt nobody will answer.

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

`post direct` always sends `privacy_level: "SELF_ONLY"`. It is a literal constant in the CLI's own source, not a flag, env var, or anything else settable from outside - there is no way to make this CLI post publicly. Before sending anything it also calls `creator info` and refuses if `SELF_ONLY` isn't actually in that account's `privacy_level_options`.

Known TikTok platform behavior this CLI surfaces automatically, not a bug in the CLI: an unaudited Sandbox app can get `unaudited_client_can_only_post_to_private_accounts` on Direct Post even with `SELF_ONLY`, if the target TikTok account itself is set to public. Setting your own account to private resolves it. `post upload` (draft to inbox) is unaffected either way and always works regardless of the account's privacy setting.

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
# open it, authorize, copy code/state from the callback page your redirect_uri serves
tiktok auth exchange --code <CODE> --state <STATE>
```

You should not need to run `auth refresh` yourself. Every command that calls the API (`profile get`, `video list/get`, `creator info`, `post upload/direct/status`) goes through a silent-refresh wrapper: on `access_token_invalid` it refreshes using the stored `refresh_token` (no prompt, no browser - the refresh_token is meant to last 365 days) and retries the original call once. `auth refresh` still exists for running it explicitly. If the refresh_token itself is also dead (TikTok returns `invalid_grant` - can happen sooner than 365 days on Sandbox apps in practice), every path converges on the same `AUTH_EXPIRED` error telling you to run `auth login`.

## Where credentials live

Everything (`client_key`/`client_secret`/`redirect_uri`/tokens) is stored in `${XDG_CONFIG_HOME:-~/.config}/tiktok-cli/.env`, written atomically. Set `TIKTOK_CLI_ENV_PATH` to point at a different file instead (useful if you keep multiple TikTok apps, or already manage secrets elsewhere). `auth exchange` checks the `--state` you pass against the one `auth login` generated and refuses on mismatch (CSRF check). A refreshed `refresh_token` can differ from the one you started with - the CLI always persists the new one, never assumes it's unchanged.

## Errors worth knowing

- `AUTH_MISSING` - a required credential isn't set, and either the terminal isn't interactive or the value was left empty at the prompt. Hint names which one.
- `AUTH_EXPIRED` - the access_token was invalid *and* the silent refresh also failed (the refresh_token is dead too). The only fix is `tiktok auth login`. If you only see `access_token_invalid` inside an `API_ERROR`, that's not this - it means the retry-with-a-fresh-token attempt is still in flight or the retry itself failed for a different reason; check the message.
- `CONFIRMATION_REQUIRED` - a T2 command needs `--yes` in non-interactive contexts.
- `KILLSWITCH_ACTIVE` - the sentinel file above is present.
- Unknown `video_ids` passed to `video get` are silently dropped by TikTok's API, not an error - compare `requested` vs. `returned` in the response.

## Working from source

If you cloned the source instead of installing from npm: `npm install` (installs ESLint as a dev-only dependency, never shipped in the published package), then `npm test` runs the suite (Node's built-in test runner, zero runtime dependencies, 21 tests) - covers the JSON envelope shape, the trust ladder's non-interactive throw, the killswitch blocking a write before any network call, the silent-refresh-and-retry path (success, and the dead-refresh_token terminal case), and - most load-bearing - that `post direct --dry-run` always produces `privacy_level: "SELF_ONLY"` and never reaches the real init/publish call. `npm link` installs the `tiktok` command from source for local testing.
