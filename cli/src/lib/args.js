import { parseArgs as nodeParseArgs } from "node:util";

// The standard set every command accepts, per the cli-build skill's
// global-flags block.
export const GLOBAL_OPTIONS = {
  json: { type: "boolean", default: false },
  human: { type: "boolean", default: false },
  yes: { type: "boolean", default: false, short: "y" },
  "dry-run": { type: "boolean", default: false },
  verbose: { type: "boolean", default: false, short: "v" },
  wait: { type: "boolean", default: false },
  help: { type: "boolean", default: false, short: "h" },
};

export function parseArgs(argv, extraOptions = {}) {
  const { values, positionals } = nodeParseArgs({
    args: argv,
    options: { ...GLOBAL_OPTIONS, ...extraOptions },
    allowPositionals: true,
    strict: true,
  });
  return { flags: values, positionals };
}
