import { existsSync } from "node:fs";
import { AppError, Codes } from "./error-map.js";
import { killswitchPath } from "./paths.js";

/**
 * Out-of-band emergency stop, independent of the trust ladder. A sentinel
 * file exists -> every write refuses, regardless of tier or --yes.
 * The human creates it with: touch <killswitchPath()>
 */
export function checkKillswitch() {
  if (existsSync(killswitchPath())) {
    throw new AppError(
      Codes.KILLSWITCH_ACTIVE,
      "Killswitch is active - all mutating commands are refused.",
      { hint: `rm ${killswitchPath()}  # once you've confirmed it's safe to resume` }
    );
  }
}
