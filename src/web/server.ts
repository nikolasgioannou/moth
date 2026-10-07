import { type FSWatcher, watch } from "node:fs";
import type { Io } from "../io.ts";
import { FILTER_OPTIONS } from "../query.ts";
import { CONFIG_FILENAME, openRepo } from "../repo.ts";
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

/**
 * A ticket body as HTML. Raw HTML in the markdown is shown as text rather than
 * passed through, and a `javascript:` link loses its target; the content
 * security policy would stop both anyway, and this way nothing even tries.
 */
export function renderBody(markdown: string): string {
  return Bun.markdown
    .html(markdown, { noHtmlBlocks: true, noHtmlSpans: true, autolinks: true })
    .replace(/href="\s*(?:javascript|vbscript|data):[^"]*"/gi, 'href="#"');
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
    <main class="main">
      <div id="problems"></div>
      <div id="view" aria-live="polite"></div>
    </main>
    <span id="live" class="pill tone-neutral live"><span class="pill-dot"></span>Connecting</span>
  </body>
</html>
`;

/** Paths the page itself handles, each answered with the same document. */
const PAGES = [/^\/$/, /^\/list$/, /^\/tickets\/[^/]+$/];

/** How long a burst of writes may go quiet before pages are told about it. */
const SETTLE_MS = 75;
/** The longest a steady stream of writes can hold back a notice. */
const MAX_WAIT_MS = 500;
/** Under Bun's idle timeout, so an open event stream is never cut off as idle. */
const HEARTBEAT_MS = 5000;

/**
 * Tells every open page when the store changes on disk. A burst of writes,
 * such as `moth check --fix` renaming many files, becomes one notice rather
 * than one per file, and pages refetch what they show.
 */
class Changes {
  private readonly pages = new Set<ReadableStreamDefaultController<Uint8Array>>();
  private watchers: FSWatcher[] = [];
  private heartbeat: ReturnType<typeof setInterval> | undefined;
  private pending: ReturnType<typeof setTimeout> | undefined;
  private since: number | undefined;
  private readonly encoder = new TextEncoder();

  constructor(private readonly cwd: string) {}

  /** An event stream for one page, watching the store from the first one on. */
  stream(signal: AbortSignal): Response {
    this.start();
    let page: ReadableStreamDefaultController<Uint8Array> | undefined;
    const body = new ReadableStream<Uint8Array>({
      start: (controller) => {
        page = controller;
        this.pages.add(controller);
        // Reconnect a second after the server goes away, which is how a page
        // finds a restarted server on its own.
        controller.enqueue(this.encoder.encode("retry: 1000\n: connected\n\n"));
      },
      cancel: () => {
        if (page !== undefined) this.pages.delete(page);
      },
    });
    signal.addEventListener("abort", () => {
      if (page !== undefined) this.pages.delete(page);
    });
    return new Response(body, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-store",
        ...SECURITY_HEADERS,
      },
    });
  }

  private start(): void {
    if (this.watchers.length > 0) return;
    const opened = openRepo(this.cwd);
    if (!opened.ok) return;
    const { root, ticketsDir } = opened.repo;
    this.watchers.push(watch(ticketsDir, () => this.changed()));
    // The config decides the columns, so a status added to it is a change too.
    // Its directory is watched rather than the file, because an editor that
    // saves by replacing the file would leave a watch on the file orphaned.
    this.watchers.push(
      watch(root, (_event, name) => {
        if (name === CONFIG_FILENAME) this.changed();
      }),
    );
    this.heartbeat = setInterval(() => this.send(": ping\n\n"), HEARTBEAT_MS);
  }

  private changed(): void {
    const now = Date.now();
    this.since ??= now;
    clearTimeout(this.pending);
    const wait = now - this.since >= MAX_WAIT_MS ? 0 : SETTLE_MS;
    this.pending = setTimeout(() => {
      this.since = undefined;
      this.send("event: change\ndata: {}\n\n");
    }, wait);
  }

  private send(text: string): void {
    const bytes = this.encoder.encode(text);
    for (const page of this.pages) {
      try {
        page.enqueue(bytes);
      } catch {
        this.pages.delete(page);
      }
    }
  }

  close(): void {
    for (const watcher of this.watchers) watcher.close();
    this.watchers = [];
    clearInterval(this.heartbeat);
    clearTimeout(this.pending);
    for (const page of this.pages) {
      try {
        page.close();
      } catch {}
    }
    this.pages.clear();
  }
}

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
  const changes = new Changes(io.cwd);
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

      const ticket = /^\/api\/tickets\/([^/]+)(\/body)?$/.exec(path);
      if (ticket !== null) {
        const id = decodeURIComponent(ticket[1] ?? "");
        const ran = await runCaptured(["show", id, "--json"], io);
        if (ran.code !== 0) return failure(ran);
        if (ticket[2] === undefined) return json(ran.out);
        const { body } = JSON.parse(ran.out) as { body: string };
        return respond(renderBody(body), "text/html; charset=utf-8");
      }

      if (path === "/api/schema") {
        const ran = await runCaptured(["schema", "--json"], io);
        return ran.code === 0 ? json(ran.out) : failure(ran, 500);
      }

      if (path === "/api/events") return changes.stream(request.signal);

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
    close() {
      changes.close();
    },
  };
}
