---
id: "095fa5"
title: People have no live view of the store
status: todo
priority: medium
labels:
  - web
created_at: 2026-10-06T20:57:54.292Z
updated_at: 2026-10-06T20:57:54.685Z
---

Agents write tickets through the CLI; the person directing them has nothing good to read them in. `moth list` and `moth show` answer one question per call, and `moth board` is stale the moment an agent moves a ticket.

`moth open` starts a server on `127.0.0.1` and opens the store in a browser: read-only, updating live as tickets change on disk. The decision and what it costs are in [ADR-0007](../docs/adr/0007-moth-open-a-read-only-view-for-people.md).

This ticket is the feature. Its work is filed under it.

**Done when**

- [ ] Every sub-ticket is done
- [ ] The spec describes `moth open`: it is in the command surface, the interface-scope section no longer says the CLI is the only interface, and "A TUI" in Out of Scope points at ADR-0007
- [ ] The README lists `moth open` and the CHANGELOG has an entry
