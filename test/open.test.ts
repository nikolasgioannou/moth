import { afterAll, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_PORT } from "../src/commands/open.ts";
import { run } from "../src/run.ts";
import { openStore } from "../src/web/server.ts";
import { type CapturedIo, captureIo } from "./helpers/capture-io.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { newTicket, ticketPath } from "./helpers/tickets.ts";
import { cleanupTempDirs, tempDir } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

/** A request as a browser on this machine would send it. */
function get(path: string, headers: Record<string, string> = {}): Request {
  return new Request(`http://127.0.0.1:6684${path}`, {
    headers: { host: "127.0.0.1:6684", ...headers },
  });
}

/** What the CLI prints for these arguments, run from `dir`. */
async function cli(dir: string, ...argv: string[]): Promise<string> {
  const io = captureIo(dir);
  expect(await run(argv, io)).toBe(0);
  return io.out();
}

/** Starts `moth open` in-process, returning its URL and a way to stop it. */
function start(io: CapturedIo, args: string[] = ["--port", "0"]) {
  let interrupt = () => {};
  const interrupted = new Promise<void>((resolve) => {
    interrupt = resolve;
  });
  const opened: CapturedIo = { ...io, untilInterrupted: () => interrupted };
  const exited = run(["open", ...args], opened);
  const stop = async () => {
    interrupt();
    return await exited;
  };
  return { url: io.out().trim(), exited, stop };
}

test("the page and its assets are served, with a policy that blocks injected script", async () => {
  const dir = await initedRepo();
  const store = openStore(captureIo(dir));

  for (const path of ["/", "/list", "/tickets/a3f8c1"]) {
    const response = await store.fetch(get(path));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain('<script src="/app.js"');
  }
  const script = await store.fetch(get("/app.js"));
  expect(script.headers.get("content-type")).toContain("javascript");
  const style = await store.fetch(get("/style.css"));
  expect(style.headers.get("content-type")).toContain("text/css");

  const policy = (await store.fetch(get("/"))).headers.get("content-security-policy") ?? "";
  expect(policy).toContain("script-src 'self'");
  expect(policy).not.toContain("unsafe-inline");
});

test("each JSON endpoint answers exactly what the CLI prints with --json", async () => {
  const dir = await initedRepo();
  const parent = await newTicket(dir, "Browser milestone", ["--priority", "high"]);
  const child = await newTicket(dir, "Chrome on the VM", ["--parent", parent, "--label", "vm"]);
  await newTicket(dir, "Domain locks", ["--blocked-by", child, "--body", "Only *these* hosts."]);
  const store = openStore(captureIo(dir));

  const body = async (path: string) => {
    const response = await store.fetch(get(path));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    return await response.text();
  };

  expect(await body("/api/tickets")).toBe(await cli(dir, "list", "--json"));
  expect(await body(`/api/tickets/${child}`)).toBe(await cli(dir, "show", child, "--json"));
  expect(await body("/api/schema")).toBe(await cli(dir, "schema", "--json"));
});

test("a ticket that does not exist is a 404 carrying moth's own message", async () => {
  const dir = await initedRepo();
  const store = openStore(captureIo(dir));

  const response = await store.fetch(get("/api/tickets/ffffff"));

  expect(response.status).toBe(404);
  expect(((await response.json()) as { error: string }).error).toBe("no ticket matches 'ffffff'");
});

test("the check endpoint lists what moth check finds", async () => {
  const dir = await initedRepo();
  const store = openStore(captureIo(dir));
  expect(await (await store.fetch(get("/api/check"))).json()).toEqual({ problems: [] });

  const id = await newTicket(dir, "Domain locks");
  const path = ticketPath(dir, id);
  writeFileSync(path, readFileSync(path, "utf8").replace("Domain locks", "Renamed by hand"));
  const io = captureIo(dir);
  await run(["check"], io);
  const expected = io
    .err()
    .split("\n")
    .filter((line) => line.startsWith("  "))
    .map((line) => line.trim());

  expect(await (await store.fetch(get("/api/check"))).json()).toEqual({ problems: expected });
});

test("a request addressed to another host is refused, so a rebound domain reads nothing", async () => {
  const dir = await initedRepo();
  const store = openStore(captureIo(dir));

  const rebound = await store.fetch(get("/api/tickets", { host: "attacker.example:6684" }));
  expect(rebound.status).toBe(403);
  expect((await store.fetch(get("/api/tickets", { host: "localhost:6684" }))).status).toBe(200);
});

test("nothing can be written through the server", async () => {
  const dir = await initedRepo();
  const store = openStore(captureIo(dir));

  const response = await store.fetch(
    new Request("http://127.0.0.1:6684/api/tickets", {
      method: "POST",
      headers: { host: "127.0.0.1:6684" },
      body: "{}",
    }),
  );

  expect(response.status).toBe(405);
});

test("moth open serves the store at the URL it prints, and stops when interrupted", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Chrome on the VM");
  const io = captureIo(dir);

  const server = start(io, ["--no-open", "--port", "0"]);

  expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  expect(io.err()).toContain("read-only");
  const tickets = (await (await fetch(`${server.url}/api/tickets`)).json()) as { id: string }[];
  expect(tickets.map((ticket) => ticket.id)).toEqual([id]);
  expect(await server.stop()).toBe(0);
  await expect(fetch(`${server.url}/api/tickets`)).rejects.toThrow();
});

test("the server listens on 127.0.0.1 alone, not on any other address", async () => {
  const dir = await initedRepo();
  const server = start(captureIo(dir));
  const port = new URL(server.url).port;

  await expect(fetch(`http://[::1]:${port}/`)).rejects.toThrow();
  expect((await fetch(`${server.url}/`)).status).toBe(200);
  await server.stop();
});

test("moth open opens a browser at a terminal, and not when piped or told not to", async () => {
  const dir = await initedRepo();

  const tty = captureIo(dir, { isTty: true });
  const atTerminal = start(tty);
  await atTerminal.stop();
  expect(tty.opened()).toEqual([atTerminal.url]);

  const told = captureIo(dir, { isTty: true });
  await start(told, ["--port", "0", "--no-open"]).stop();
  expect(told.opened()).toEqual([]);

  const piped = captureIo(dir);
  await start(piped).stop();
  expect(piped.opened()).toEqual([]);
});

test("a port that is taken falls back to a free one, unless it was asked for", async () => {
  const dir = await initedRepo();
  const first = start(captureIo(dir));
  const taken = new URL(first.url).port;

  // Hold the default port, whoever has it, so the fallback is what gets tested.
  let holder: ReturnType<typeof Bun.serve> | null = null;
  try {
    holder = Bun.serve({ hostname: "127.0.0.1", port: DEFAULT_PORT, fetch: () => new Response() });
  } catch {}
  const fallback = start(captureIo(dir), ["--no-open"]);
  expect(fallback.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  expect(new URL(fallback.url).port).not.toBe(String(DEFAULT_PORT));
  await fallback.stop();
  await holder?.stop(true);

  const io = captureIo(dir);
  expect(await run(["open", "--port", taken], io)).toBe(1);
  expect(io.err()).toContain(`port ${taken} is already in use`);

  await first.stop();
});

test("moth open refuses a port that is not one, as a usage error", async () => {
  const dir = await initedRepo();
  for (const port of ["http", "-1", "70000", "80.5"]) {
    const io = captureIo(dir);
    expect(await run(["open", "--port", port], io)).toBe(2);
    expect(io.out()).toBe("");
  }
});

test("outside a moth repo, moth open fails as moth list does", async () => {
  const dir = tempDir();
  const open = captureIo(dir);
  const list = captureIo(dir);

  expect(await run(["open", "--no-open"], open)).toBe(1);
  expect(await run(["list"], list)).toBe(1);
  expect(open.err()).toBe(list.err());
});

test("the tickets a card marks as blocked are exactly those moth list does not call unblocked", async () => {
  const dir = await initedRepo();
  const chrome = await newTicket(dir, "Chrome on the VM");
  const finished = await newTicket(dir, "Pick a VM image");
  await run(["move", finished, "done"], captureIo(dir));
  await newTicket(dir, "Domain locks", ["--blocked-by", chrome]);
  await newTicket(dir, "Screenshots", ["--blocked-by", finished]);
  await newTicket(dir, "Downloads", ["--blocked-by", chrome, "--blocked-by", finished]);
  const store = openStore(captureIo(dir));

  const ids = (tickets: { id: string }[]) => tickets.map((ticket) => ticket.id).sort();
  const blocked = ids(
    (await (await store.fetch(get("/api/tickets?blocked"))).json()) as { id: string }[],
  );
  const all = ids(JSON.parse(await cli(dir, "list", "--json")));
  const unblocked = ids(JSON.parse(await cli(dir, "list", "--unblocked", "--json")));

  expect(blocked).toHaveLength(2);
  expect(blocked).toEqual(all.filter((id) => !unblocked.includes(id)));
});

test("columns follow the config's status order, and cards within one follow moth list", async () => {
  const dir = await initedRepo();
  const config = join(dir, "moth.config.yml");
  writeFileSync(
    config,
    readFileSync(config, "utf8").replace(
      "  - name: done",
      "  - name: in-review\n    category: started\n  - name: done",
    ),
  );
  const old = await newTicket(dir, "Old and low", ["--priority", "low"]);
  const urgent = await newTicket(dir, "New and urgent", ["--priority", "urgent"]);
  for (const id of [old, urgent]) await run(["move", id, "in-review"], captureIo(dir));
  const store = openStore(captureIo(dir));

  const schema = (await (await store.fetch(get("/api/schema"))).json()) as {
    statuses: { name: string }[];
  };
  const names = schema.statuses.map((status) => status.name);
  expect(names.indexOf("in-review")).toBe(names.indexOf("in-progress") + 1);

  const tickets = (await (await store.fetch(get("/api/tickets"))).json()) as {
    id: string;
    status: string;
  }[];
  const column = tickets.filter((ticket) => ticket.status === "in-review").map((t) => t.id);
  const listed = JSON.parse(await cli(dir, "list", "--status", "in-review", "--json")) as {
    id: string;
  }[];
  expect(column).toEqual(listed.map((ticket) => ticket.id));
  expect(column).toEqual([urgent, old]);
});

test("a body renders as HTML, with markdown intact and nothing able to run", async () => {
  const dir = await initedRepo();
  const body = [
    "Intro with `code` and <b>raw html</b>.",
    "",
    "<script>alert(1)</script>",
    "",
    "| host | allowed |",
    "| --- | --- |",
    "| example.com | yes |",
    "",
    "```ts",
    "if (a < b) run();",
    "```",
    "",
    "- [x] done",
    "- [ ] not yet",
    "",
    "[a link](javascript:alert(1)) and [a real one](https://example.com)",
  ].join("\n");
  const id = await newTicket(dir, "Domain locks", ["--body-file", "-"], { stdin: body });
  const store = openStore(captureIo(dir));

  const response = await store.fetch(get(`/api/tickets/${id}/body`));
  const html = await response.text();

  expect(response.headers.get("content-type")).toContain("text/html");
  expect(html).toContain("<table>");
  expect(html).toContain('<code class="language-ts">if (a &lt; b) run();');
  expect(html).toContain('type="checkbox" class="task-list-item-checkbox" disabled checked');
  expect(html).toContain("&lt;b&gt;raw html&lt;/b&gt;");
  expect(html).not.toContain("<script");
  expect(html).not.toContain("javascript:");
  expect(html).toContain('href="https://example.com"');
});

test("a ticket's URL is its id, so it survives a rename", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Domain locks");
  const store = openStore(captureIo(dir));

  await run(["edit", id, "--title", "Lock browsing to listed domains"], captureIo(dir));

  const response = await store.fetch(get(`/api/tickets/${id}`));
  expect(response.status).toBe(200);
  expect(((await response.json()) as { title: string }).title).toBe(
    "Lock browsing to listed domains",
  );
  expect((await store.fetch(get(`/tickets/${id}`))).status).toBe(200);
});

test("every list filter in the query string answers what moth list does with that flag", async () => {
  const dir = await initedRepo();
  const milestone = await newTicket(dir, "Browser milestone", ["--priority", "high"]);
  const chrome = await newTicket(dir, "Chrome on the VM", [
    "--parent",
    milestone,
    "--label",
    "vm",
    "--label",
    "browser",
  ]);
  await newTicket(dir, "Domain locks", ["--parent", milestone, "--label", "browser"]);
  await newTicket(dir, "Screenshots", ["--blocked-by", chrome, "--priority", "low"]);
  await newTicket(dir, "Downloads", ["--body", "Saved to the VM's disk."]);
  await run(["move", chrome, "in-progress"], captureIo(dir));
  const store = openStore(captureIo(dir));

  const cases: [string, string[]][] = [
    ["status=backlog", ["--status", "backlog"]],
    ["status=backlog&status=in-progress", ["--status", "backlog", "--status", "in-progress"]],
    ["status=backlog,in-progress", ["--status", "backlog,in-progress"]],
    ["category=started", ["--category", "started"]],
    ["priority=high&priority=low", ["--priority", "high", "--priority", "low"]],
    ["label=browser", ["--label", "browser"]],
    ["label=browser&label=vm", ["--label", "browser", "--label", "vm"]],
    [`parent=${milestone}`, ["--parent", milestone]],
    ["parent=none", ["--parent", "none"]],
    ["parent=browser%20milestone", ["--parent", "browser milestone"]],
    ["search=disk", ["--search", "disk"]],
    ["blocked", ["--blocked"]],
    ["unblocked", ["--unblocked"]],
    [
      "unblocked&label=browser&status=backlog",
      ["--unblocked", "--label", "browser", "--status", "backlog"],
    ],
  ];
  for (const [query, flags] of cases) {
    const response = await store.fetch(get(`/api/tickets?${query}`));
    expect({ query, body: await response.text() }).toEqual({
      query,
      body: await cli(dir, "list", "--json", ...flags),
    });
  }
});

test("a filter moth list refuses is refused with its message, and unknown parameters are ignored", async () => {
  const dir = await initedRepo();
  await newTicket(dir, "Chrome on the VM");
  const store = openStore(captureIo(dir));

  const missing = await store.fetch(get("/api/tickets?parent=nothing-called-this"));
  expect(missing.status).toBe(422);
  expect(((await missing.json()) as { error: string }).error).toBe(
    "no parent matches 'nothing-called-this'",
  );

  const twice = await store.fetch(get("/api/tickets?search=a&search=b"));
  expect(twice.status).toBe(400);

  const ignored = await store.fetch(get("/api/tickets?json&fix&body=x"));
  expect(await ignored.text()).toBe(await cli(dir, "list", "--json"));
});
