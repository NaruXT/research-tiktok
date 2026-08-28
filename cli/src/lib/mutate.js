import { auditPending, auditSettled } from "./audit-log.js";
import { approveGate } from "./trust-ladder.js";

/**
 * Every write goes through this: killswitch + trust gate first, then a
 * pending audit record written *before* the network call (so a killed
 * process leaves a paper trail instead of silence), then the call, then the
 * settled record with the same id.
 */
export async function mutate(ctx, { action, trust, input, preview }, fn) {
  // dry-run is inherently safe - nothing happens - so it bypasses the trust
  // gate (and the killswitch, which only guards actual writes) entirely
  // rather than requiring the approval it exists to let you skip.
  if (ctx.flags["dry-run"]) {
    return { dryRun: true, wouldSend: preview };
  }

  await approveGate(ctx, preview, { trust, yes: ctx.flags.yes });

  const id = await auditPending(action, input);
  try {
    const output = await fn();
    await auditSettled(id, action, { ok: true, output });
    return output;
  } catch (error) {
    await auditSettled(id, action, {
      ok: false,
      error: { message: error.message, code: error.code },
    });
    throw error;
  }
}
