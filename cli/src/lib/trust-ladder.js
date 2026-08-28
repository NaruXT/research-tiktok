import { createInterface } from "node:readline/promises";
import { stdin, stderr } from "node:process";
import { AppError, Codes } from "./error-map.js";
import { checkKillswitch } from "./killswitch.js";

/**
 * T0 - runs silently (reads, status checks). Callers simply never call approveGate.
 * T1 - logged (via audit-log), no confirmation prompt.
 * T2 - shows a preview, requires --yes (agents) or an interactive y/N (humans).
 *
 * The critical behavior: in JSON mode or when stdin isn't a real TTY, a T2 gate
 * throws instead of prompting. A prompt in a piped context hangs forever and an
 * agent can't tell that apart from a hung network call.
 */
export async function approveGate(ctx, preview, { trust, yes }) {
  checkKillswitch();

  if (trust === "T0") return;

  if (trust === "T1") {
    // Logged only - the caller's audit-log wrapper records it; no prompt.
    return;
  }

  if (trust === "T2") {
    if (yes) return;

    const interactive = stdin.isTTY && !ctx.isJson;
    if (!interactive) {
      throw new AppError(
        Codes.CONFIRMATION_REQUIRED,
        "This action requires confirmation and no TTY is available to ask for it.",
        {
          hint: "re-run with --yes once you've reviewed the preview below",
        }
      );
    }

    stderr.write(JSON.stringify({ preview }, null, 2) + "\n");
    const rl = createInterface({ input: stdin, output: stderr });
    const answer = await rl.question("Proceed? [y/N] ");
    rl.close();
    if (!/^y(es)?$/i.test(answer.trim())) {
      throw new AppError(Codes.CONFIRMATION_REQUIRED, "Cancelled by user.");
    }
    return;
  }

  throw new AppError(Codes.VALIDATION_ERROR, `Unknown trust tier: ${trust}`);
}
