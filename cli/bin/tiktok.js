#!/usr/bin/env node
import { parseArgs } from "../src/lib/args.js";
import { runCommand } from "../src/lib/run.js";
import { loadEnv } from "../src/lib/env.js";
import { AppError, Codes } from "../src/lib/error-map.js";

import { authLogin } from "../src/commands/auth/login.js";
import { authExchange } from "../src/commands/auth/exchange.js";
import { authRefresh } from "../src/commands/auth/refresh.js";
import { authRevoke } from "../src/commands/auth/revoke.js";
import { profileGet } from "../src/commands/profile/get.js";
import { videoList } from "../src/commands/video/list.js";
import { videoGet } from "../src/commands/video/get.js";
import { creatorInfo } from "../src/commands/creator/info.js";
import { postUpload } from "../src/commands/post/upload.js";
import { postDirect } from "../src/commands/post/direct.js";
import { postStatus } from "../src/commands/post/status.js";
import { schemaCommand } from "../src/commands/schema.js";

const ROUTES = {
  "auth login": {
    options: { scope: { type: "string" } },
    handler: (ctx, f) => authLogin(ctx, { scope: f.scope }),
  },
  "auth exchange": {
    options: { code: { type: "string" }, state: { type: "string" } },
    handler: (ctx, f) => authExchange(ctx, { code: f.code, state: f.state }),
  },
  "auth refresh": { options: {}, handler: (ctx) => authRefresh(ctx) },
  "auth revoke": { options: {}, handler: (ctx) => authRevoke(ctx) },
  "profile get": { options: {}, handler: () => profileGet() },
  "video list": {
    options: { "max-count": { type: "string" }, cursor: { type: "string" } },
    handler: (ctx, f) => videoList(ctx, { maxCount: f["max-count"], cursor: f.cursor }),
  },
  "video get": {
    options: { ids: { type: "string" } },
    handler: (ctx, f) => videoGet(ctx, { ids: f.ids }),
  },
  "creator info": { options: {}, handler: () => creatorInfo() },
  "post upload": {
    options: { file: { type: "string" } },
    handler: (ctx, f) => postUpload(ctx, { file: f.file }),
  },
  "post direct": {
    options: {
      file: { type: "string" },
      caption: { type: "string" },
      "disable-comment": { type: "boolean" },
      "disable-duet": { type: "boolean" },
      "disable-stitch": { type: "boolean" },
    },
    handler: (ctx, f) =>
      postDirect(ctx, {
        file: f.file,
        caption: f.caption,
        disableComment: f["disable-comment"],
        disableDuet: f["disable-duet"],
        disableStitch: f["disable-stitch"],
      }),
  },
  "post status": {
    options: { "publish-id": { type: "string" } },
    handler: (ctx, f) => postStatus(ctx, { publishId: f["publish-id"] }),
  },
};

function printHelp() {
  console.error("tiktok - CLI over TikTok's Login Kit, Display, and Content Posting APIs\n");
  console.error("Usage: tiktok <noun> <verb> [flags]\n");
  console.error("Commands:");
  for (const key of Object.keys(ROUTES)) console.error(`  tiktok ${key}`);
  console.error("  tiktok schema [<noun> <verb>]\n");
  console.error("Global flags: --json --yes/-y --dry-run --wait --verbose/-v --help/-h");
  console.error("\nAgent manual: skills/tiktok-cli/SKILL.md (in the installed package)");
}

async function main() {
  const argv = process.argv.slice(2);
  await loadEnv();

  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    printHelp();
    process.exitCode = 0;
    return;
  }

  if (argv[0] === "schema") {
    const { flags, positionals } = parseArgs(argv.slice(1), {});
    await runCommand(flags, (ctx) => schemaCommand(ctx, positionals));
    return;
  }

  const key = `${argv[0]} ${argv[1] ?? ""}`.trim();
  const route = ROUTES[key];
  if (!route) {
    const { flags } = parseArgs(argv, {});
    await runCommand(flags, () => {
      throw new AppError(Codes.UNKNOWN_COMMAND, `Unknown command: ${key || "(none)"}`, {
        hint: "run `tiktok --help` or `tiktok schema` for the full list",
      });
    });
    return;
  }

  const { flags } = parseArgs(argv.slice(2), route.options);
  await runCommand(flags, (ctx) => route.handler(ctx, flags));
}

main();
