// Non-TTY implies JSON, without a flag: the highest-value default from the
// cli-build skill. An agent that forgets --json still gets parseable output.
export function detectMode(flags) {
  if (flags.json) return "json";
  if (flags.human) return "human";
  return process.stdout.isTTY ? "human" : "json";
}

export function isJsonMode(flags) {
  return detectMode(flags) === "json";
}

/** Data on stdout, always. */
export function emitOk(data, meta = {}) {
  const envelope = { ok: true, data, meta };
  process.stdout.write(JSON.stringify(envelope) + "\n");
}

/** Diagnostics and errors on stderr in JSON mode too - stdout stays parseable. */
export function emitErr(appError) {
  const envelope = { ok: false, error: appError.toJSON() };
  process.stdout.write(JSON.stringify(envelope) + "\n");
}

export function emitNextSteps(steps) {
  if (!steps?.length) return;
  process.stderr.write(
    JSON.stringify({ nextSteps: steps }) + "\n"
  );
}
