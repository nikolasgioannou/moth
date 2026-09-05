import pkg from "../package.json";
import { board } from "./commands/board.ts";
import { check } from "./commands/check.ts";
import { edit } from "./commands/edit.ts";
import { init } from "./commands/init.ts";
import { list } from "./commands/list.ts";
import { move } from "./commands/move.ts";
import { create } from "./commands/new.ts";
import { remove } from "./commands/remove.ts";
import { schema } from "./commands/schema.ts";
import { show } from "./commands/show.ts";
import { upgrade } from "./commands/upgrade.ts";
import { commandHelp, topLevelHelp } from "./help.ts";
import type { Io } from "./io.ts";

export type { Io } from "./io.ts";

/** Every command satisfies this interface; run dispatches across them. */
type Command = (argv: string[], io: Io) => Promise<number>;

const COMMANDS: Record<string, Command> = {
  init,
  new: create,
  board,
  check,
  edit,
  list,
  move,
  delete: remove,
  schema,
  show,
  upgrade,
};

/** Every name run dispatches on, so help coverage can be checked against it. */
export const COMMAND_LIST = Object.keys(COMMANDS);

export async function run(argv: string[], io: Io): Promise<number> {
  const command = argv[0];

  if (command === "--version") {
    io.stdout(`${pkg.version}\n`);
    return 0;
  }

  // Help is answered here so every command has it without implementing it.
  const wantsHelp = argv.includes("--help") || argv.includes("-h");
  if (command === undefined || command === "help" || (wantsHelp && command.startsWith("-"))) {
    io.stdout(topLevelHelp(pkg.version));
    return 0;
  }
  if (wantsHelp) {
    const text = commandHelp(command);
    if (text !== null) {
      io.stdout(text);
      return 0;
    }
  }

  const handler = command === undefined ? undefined : COMMANDS[command];
  if (handler === undefined) {
    io.stderr(`moth: unknown command '${command}'\n`);
    return 2;
  }

  return await handler(argv, io);
}
