---
id: "f0fc70"
title: moth open serves the store and opens a browser
status: done
priority: high
labels:
  - web
parent: "095fa5"
created_at: 2026-10-06T20:57:54.343Z
updated_at: 2026-10-06T21:10:00.314Z
---

The foundation the views are built on: the command, the server, and the seam its tests use.

**What to build**

- `moth open` starts `Bun.serve` bound to `127.0.0.1`, prints the URL, and runs until interrupted
- A default port, falling back to a free one if it is taken; `--port <n>` fixes it and fails with exit `1` if that port is taken
- Opens the default browser when stdout is a terminal; `--no-open` suppresses it, and without a terminal it never tries
- HTML, CSS and JavaScript embedded in the binary, the way the skill is, so nothing is read from disk but the store
- JSON endpoints for the store, a ticket, the schema and `moth check` diagnostics, returning exactly what the matching `--json` command prints
- The request handler is a plain function taking a working directory and a `Request`, so tests call it in-process against a temp directory
- `--help` with a worked example, saying it is for people and read-only

**Done when**

- [x] `moth open --no-open` in a moth repo serves a page at the printed URL, and the server refuses connections on any address but `127.0.0.1`
- [x] Each JSON endpoint's body is byte-identical to its CLI `--json` counterpart, asserted by a test
- [x] Outside a moth repo it exits `1` with the same error as `moth list`
- [x] A smoke test starts the compiled binary, fetches `/`, and stops it

## As built

The server answers by running the CLI in-process through `run(argv, io)` with output captured, so the JSON endpoints are the CLI's own output rather than a reimplementation: `/api/tickets` is `moth list --json` (query parameters become `moth list`'s filter flags, and nothing else), `/api/tickets/<id>` is `moth show --json`, and `/api/schema` is `moth schema --json`. `/api/check` returns `moth check`'s findings as `{ "problems": [...] }`, since check has no JSON form.

Beyond the plan:

- Requests whose `Host` is not `127.0.0.1` or `localhost` are refused, so a page that rebinds its own domain to 127.0.0.1 cannot read the store.
- Every response carries a content security policy with no inline script, so a ticket body rendered as HTML can never run code.
- Anything but GET and HEAD is a 405.
- `Io` gained `openUrl` and `untilInterrupted`, so tests drive the whole command, browser and Ctrl-C included.

The default port is 6684, "MOTH" on a phone keypad. The page shell is inlined in `src/web/server.ts`, because Bun types `*.html` imports as HTML bundles; the stylesheet and `app.js` are imported as text.
