import pkg from "../package.json";
import { init } from "./commands/init.ts";
import { list } from "./commands/list.ts";
import { create } from "./commands/new.ts";
import { show } from "./commands/show.ts";
import type { Io } from "./io.ts";

export type { Io } from "./io.ts";

/** Every command satisfies this interface; run dispatches across them. */
type Command = (argv: string[], io: Io) => Promise<number>;

const COMMANDS: Record<string, Command> = {
  init,
  new: create,
  list,
  show,
};

export async function run(argv: string[], io: Io): Promise<number> {
  const command = argv[0];

  if (command === "--version") {
    io.stdout(`${pkg.version}\n`);
    return 0;
  }

  const handler = command === undefined ? undefined : COMMANDS[command];
  if (handler === undefined) {
    io.stderr(`moth: unknown command '${command}'\n`);
    return 2;
  }

  return await handler(argv, io);
}
