import type { Io } from "../io.ts";
import { FILTER_OPTIONS } from "../query.ts";
import { run } from "../run.ts";
import app from "./app.js" with { type: "text" };
import style from "./style.css" with { type: "text" };

/** What one run of a command left behind. */
interface Ran {
  code: number;
  out: string;
  err: string;
}

/**
 * Every answer comes from running the CLI itself, with output captured, so the
 * page cannot disagree with `moth` about what a ticket is: one serializer, one
 * filter implementation, one set of validation rules (ADR-0007).
 */
async function runCaptured(argv: string[], io: Io): Promise<Ran> {
  let out = "";
  let err = "";
  const code = await run(argv, {
    ...io,
    stdout: (text) => {
      out += text;
    },
    stderr: (text) => {
      err += text;
    },
    isTty: false,
    // Nothing the server runs reads input or asks a question; failing loudly
    // beats a request that hangs forever waiting on a terminal.
    prompt: async () => {
      throw new Error("the server cannot prompt");
    },
    stdin: async () => {
      throw new Error("the server has no stdin");
    },
  });
  return { code, out, err };
}

/**
 * A query string as `moth list` flags. Only the filters are carried over, so a
 * URL cannot smuggle in `--json` twice or any flag the list does not take, and
 * a repeated parameter becomes a repeated flag, as it would be typed.
 */
export function filterFlags(params: URLSearchParams): string[] {
  const flags: string[] = [];
  for (const [name, value] of params) {
    const spec = FILTER_OPTIONS[name];
    if (spec === undefined) continue;
    if (spec.type === "boolean") {
      if (value !== "false" && value !== "0") flags.push(`--${name}`);
      continue;
    }
    flags.push(`--${name}`, value);
  }
  return flags;
}

/**
 * Browsers attach a Host header naming whatever domain they think they are on.
 * A page elsewhere that rebinds its own domain to 127.0.0.1 would otherwise be
 * able to read the store, so only requests addressed to this machine by name
 * are answered.
 */
function addressedLocally(request: Request): boolean {
  const host = request.headers.get("host");
  if (host === null) return false;
  const hostname = host.replace(/:\d+$/, "");
  return hostname === "127.0.0.1" || hostname === "localhost";
}

const SECURITY_HEADERS = {
  // Ticket bodies are rendered as HTML, and a body is text anyone with commit
  // access wrote. No inline script, no script from elsewhere, and no
  // javascript: link can run, whatever a body manages to contain.
  "content-security-policy":
    "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

function respond(body: string, type: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": type, "cache-control": "no-store", ...SECURITY_HEADERS },
  });
}

/** A command's JSON output, passed through exactly as the CLI printed it. */
function json(body: string, status = 200): Response {
  return respond(body, "application/json; charset=utf-8", status);
}

/** A failure, carrying the sentence moth would have printed on stderr. */
function failure(ran: Ran, notFound = 404): Response {
  const message = ran.err.replace(/^moth: /gm, "").trim();
  // Exit 2 is a request moth would never accept; exit 1 is one it could, here.
  const status = ran.code === 2 ? 400 : notFound;
  return json(`${JSON.stringify({ error: message }, null, 2)}\n`, status);
}

/** The one document every page route answers with; app.js draws the rest. */
const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>moth</title>
    <link rel="stylesheet" href="/style.css" />
    <script src="/app.js" defer></script>
  </head>
  <body>
    <header class="top">
      <a class="brand" href="/">moth</a>
      <nav>
        <a href="/" data-route="columns">Columns</a>
        <a href="/list" data-route="list">List</a>
      </nav>
      <span class="readonly">read-only</span>
    </header>
    <main id="view" aria-live="polite"></main>
  </body>
</html>
`;

/** Paths the page itself handles, each answered with the same document. */
const PAGES = [/^\/$/, /^\/list$/, /^\/tickets\/[^/]+$/];

export interface Store {
  /** Answers one request. A plain function, so tests call it without a socket. */
  fetch(request: Request): Promise<Response>;
  /** Releases anything the store holds open. */
  close(): void;
}

/**
 * The read-only server behind `moth open`. Every command runs with `io.cwd` as
 * its working directory, so the server sees exactly what `moth` run from the
 * same place would.
 */
export function openStore(io: Io): Store {
  return {
    async fetch(request) {
      if (!addressedLocally(request)) {
        return respond("moth only answers requests addressed to 127.0.0.1\n", "text/plain", 403);
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        return respond("moth open is read-only\n", "text/plain", 405);
      }

      const url = new URL(request.url);
      const path = url.pathname;

      if (PAGES.some((pattern) => pattern.test(path))) {
        return respond(PAGE, "text/html; charset=utf-8");
      }
      if (path === "/app.js") return respond(app, "text/javascript; charset=utf-8");
      if (path === "/style.css") return respond(style, "text/css; charset=utf-8");

      if (path === "/api/tickets") {
        const ran = await runCaptured(["list", "--json", ...filterFlags(url.searchParams)], io);
        return ran.code === 0 ? json(ran.out) : failure(ran, 422);
      }

      const ticket = /^\/api\/tickets\/([^/]+)$/.exec(path);
      if (ticket !== null) {
        const id = decodeURIComponent(ticket[1] ?? "");
        const ran = await runCaptured(["show", id, "--json"], io);
        return ran.code === 0 ? json(ran.out) : failure(ran);
      }

      if (path === "/api/schema") {
        const ran = await runCaptured(["schema", "--json"], io);
        return ran.code === 0 ? json(ran.out) : failure(ran, 500);
      }

      if (path === "/api/check") {
        // check has no JSON form; its findings are one indented line each.
        const ran = await runCaptured(["check"], io);
        const problems = ran.err
          .split("\n")
          .filter((line) => line.startsWith("  "))
          .map((line) => line.trim());
        return json(`${JSON.stringify({ problems }, null, 2)}\n`);
      }

      return respond("not found\n", "text/plain", 404);
    },
    close() {},
  };
}
