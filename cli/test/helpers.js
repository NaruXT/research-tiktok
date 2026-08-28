import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Isolate each test from the real .env and the real XDG state dir. */
export async function isolate() {
  const dir = await mkdtemp(join(tmpdir(), "tiktok-cli-test-"));
  process.env.XDG_STATE_HOME = dir;
  process.env.TIKTOK_CLI_ENV_PATH = join(dir, "nonexistent.env");
  return dir;
}

export function stubFetch(responses) {
  let call = 0;
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    const next = responses[Math.min(call, responses.length - 1)];
    call++;
    return {
      ok: next.status ? next.status < 400 : true,
      status: next.status ?? 200,
      text: async () => JSON.stringify(next.body ?? {}),
    };
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}
