import { COMMANDS, SCHEMA_VERSION } from "../lib/schema.js";
import { AppError, Codes } from "../lib/error-map.js";
import { printKeyValue, printTable } from "../lib/human.js";

export async function schemaCommand(ctx, positionals) {
  const name = positionals.join(" ");

  if (!name) {
    const rows = Object.entries(COMMANDS).map(([command, def]) => ({
      command,
      trust: def.trust,
    }));
    return {
      data: { version: SCHEMA_VERSION, commands: rows },
      human: () => {
        console.log(`schema version ${SCHEMA_VERSION}\n`);
        printTable(rows, ["command", "trust"]);
      },
    };
  }

  const def = COMMANDS[name];
  if (!def) {
    throw new AppError(Codes.UNKNOWN_COMMAND, `No such command: ${name}`, {
      hint: "run `tiktok schema` with no arguments to list all commands",
    });
  }

  return {
    data: { version: SCHEMA_VERSION, command: name, ...def },
    human: () => printKeyValue({ command: name, ...def, flags: JSON.stringify(def.flags), output: JSON.stringify(def.output) }),
  };
}
