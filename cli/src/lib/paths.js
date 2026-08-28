import { homedir } from "node:os";
import { join } from "node:path";

// XDG state dir, with a HOME override honored for test isolation.
export function stateDir() {
  const base =
    process.env.XDG_STATE_HOME || join(homedir(), ".local", "state");
  return join(base, "tiktok-cli");
}

export function killswitchPath() {
  return join(stateDir(), "KILLSWITCH");
}
