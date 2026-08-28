import { randomBytes } from "node:crypto";
import { rename, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Temp file + rename. No partial writes on crash: a reader either sees the
 * old content or the fully-written new content, never a half-written file.
 */
export async function atomicWrite(path, content, { mode } = {}) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(tmp, content, mode ? { mode } : undefined);
  await rename(tmp, path);
}

/** Append-only, restrictive permissions (0600). Caller supplies the full line incl. newline. */
export async function atomicAppend(path, line) {
  await mkdir(dirname(path), { recursive: true });
  const { appendFile } = await import("node:fs/promises");
  await appendFile(path, line, { mode: 0o600 });
}
