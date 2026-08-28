import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const CTRL_C = String.fromCharCode(3);
const CTRL_D = String.fromCharCode(4);
const BACKSPACE = String.fromCharCode(127);

/** Visible line prompt - for values that aren't secret (client_key, redirect_uri). */
export async function promptVisible(question) {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

/**
 * Reads a line from a real TTY without echoing it, character by character in
 * raw mode. Returns null if stdin isn't a TTY - callers must already have
 * checked that before calling, this never hangs waiting for input that will
 * never come.
 */
export async function promptSecret(question) {
  if (!stdin.isTTY) return null;
  stdout.write(question);

  return new Promise((resolve) => {
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
    };

    const onData = (char) => {
      if (char === "\n" || char === "\r" || char === CTRL_D) {
        cleanup();
        stdout.write("\n");
        resolve(value.trim());
        return;
      }
      if (char === CTRL_C) {
        cleanup();
        stdout.write("\n");
        process.exit(130);
        return;
      }
      if (char === BACKSPACE || char === "\b") {
        value = value.slice(0, -1);
        return;
      }
      value += char;
    };

    stdin.on("data", onData);
  });
}
