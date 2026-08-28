import { AppError, Codes } from "./error-map.js";
import { detectMode, emitOk, emitErr, emitNextSteps } from "./json-mode.js";

/**
 * Wraps a command's body: resolves human vs. json mode once, catches
 * AppError (and anything else) into the same envelope shape, sets a
 * meaningful exit code. Every command entrypoint goes through this.
 */
export async function runCommand(flags, body) {
  const mode = detectMode(flags);
  const ctx = { isJson: mode === "json", flags };
  try {
    const result = await body(ctx);
    if (mode === "json") {
      emitOk(result?.data ?? null, result?.meta ?? {});
      if (result?.nextSteps) emitNextSteps(result.nextSteps);
    } else if (result?.human) {
      result.human();
      if (result?.nextSteps?.length) {
        console.error("\nNext:");
        for (const step of result.nextSteps) console.error(`  ${step}`);
      }
    }
    process.exitCode = 0;
  } catch (err) {
    const appErr =
      err instanceof AppError
        ? err
        : new AppError(Codes.API_ERROR, err.message || String(err));
    if (mode === "json") {
      emitErr(appErr);
    } else {
      console.error(`error: ${appErr.message}`);
      if (appErr.hint) console.error(`hint:  ${appErr.hint}`);
    }
    process.exitCode = appErr.exitCode ?? 1;
  }
}
