---
id: "f0fc70"
title: moth open serves the store and opens a browser
status: todo
priority: high
labels:
  - web
parent: "095fa5"
created_at: 2026-10-06T20:57:54.343Z
updated_at: 2026-10-06T20:57:54.732Z
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

- [ ] `moth open --no-open` in a moth repo serves a page at the printed URL, and the server refuses connections on any address but `127.0.0.1`
- [ ] Each JSON endpoint's body is byte-identical to its CLI `--json` counterpart, asserted by a test
- [ ] Outside a moth repo it exits `1` with the same error as `moth list`
- [ ] A smoke test starts the compiled binary, fetches `/`, and stops it
