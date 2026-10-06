import { openCommand } from "../command.ts";
import type { Io } from "../io.ts";
import { openStore } from "../web/server.ts";

/** "MOTH" on a phone keypad. Used unless taken, when any free port will do. */
export const DEFAULT_PORT = 6684;

/** Only this machine can reach the server; see ADR-0007. */
const HOSTNAME = "127.0.0.1";

function inUse(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "EADDRINUSE";
}

export async function open(argv: string[], io: Io): Promise<number> {
  const opened = openCommand(argv, io, {
    port: { type: "string" },
    "no-open": { type: "boolean" },
  });
  if (!opened.ok) return opened.code;
  const { values } = opened;

  let port = DEFAULT_PORT;
  if (typeof values.port === "string") {
    port = Number(values.port);
    if (!/^\d+$/.test(values.port) || port > 65535) {
      io.stderr(`moth: --port takes a number from 0 to 65535, not '${values.port}'\n`);
      return 2;
    }
  }

  const store = openStore(io);
  const serve = (on: number) =>
    Bun.serve({ hostname: HOSTNAME, port: on, fetch: (request) => store.fetch(request) });

  let server: ReturnType<typeof serve>;
  try {
    server = serve(port);
  } catch (error) {
    if (!inUse(error)) throw error;
    // A port the user asked for is a promise; the default is only a preference.
    if (typeof values.port === "string") {
      io.stderr(`moth: port ${port} is already in use; try another, or --port 0 for any\n`);
      store.close();
      return 1;
    }
    server = serve(0);
  }

  const url = `http://${HOSTNAME}:${server.port}`;
  io.stdout(`${url}\n`);
  io.stderr("moth: serving tickets read-only; press Ctrl-C to stop\n");
  if (io.isTty && values["no-open"] !== true) io.openUrl(url);

  await io.untilInterrupted();
  store.close();
  await server.stop(true);
  return 0;
}
