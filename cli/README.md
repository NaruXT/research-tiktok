# tiktok-cli

Agent-first CLI over TikTok's own Login Kit, Display, and Content Posting APIs. Zero runtime dependencies.

## Install

```bash
npm install -g tiktok-cli
# or, one-off:
npx tiktok-cli --help
```

## Requirements

Your own TikTok Developer App (Sandbox is enough), registered at [developers.tiktok.com](https://developers.tiktok.com). The CLI never ships or shares anyone else's app credentials.

## Quick start

```bash
tiktok auth login                                     # prints an authorize URL
tiktok auth exchange --code <CODE> --state <STATE>     # from the callback page
tiktok profile get
tiktok post upload --file ./video.mp4                  # draft to your inbox
```

Missing `client_key`/`client_secret`/`redirect_uri`? The CLI asks for them once, inline, the first time it needs one - no manual setup file to write by hand.

## Full docs

See [`skills/tiktok-cli/SKILL.md`](skills/tiktok-cli/SKILL.md) for the complete command reference, trust tiers, safe-publishing workflows, and error codes - it's the same manual an agent driving this CLI reads.

## Safety

`post direct` (the only command that can put content on your real account) always sends `privacy_level: SELF_ONLY`, hardcoded in source - never a flag, never overridable. Every other mutating command requires `--yes` outside an interactive terminal rather than hanging on a prompt.

## License

MIT
