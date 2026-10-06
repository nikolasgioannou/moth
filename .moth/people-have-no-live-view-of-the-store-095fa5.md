---
id: "095fa5"
title: People have no live view of the store
status: done
priority: medium
labels:
  - web
created_at: 2026-10-06T20:57:54.292Z
updated_at: 2026-10-06T21:18:06.510Z
---

Agents write tickets through the CLI; the person directing them has nothing good to read them in. `moth list` and `moth show` answer one question per call, and `moth board` is stale the moment an agent moves a ticket.

`moth open` starts a server on `127.0.0.1` and opens the store in a browser: read-only, updating live as tickets change on disk. The decision and what it costs are in [ADR-0007](../docs/adr/0007-moth-open-a-read-only-view-for-people.md).

This ticket is the feature. Its work is filed under it.

**Done when**

- [x] Every sub-ticket is done
- [x] The spec describes `moth open`: it is in the command surface, the interface-scope section no longer says the CLI is the only interface, and "A TUI" in Out of Scope points at ADR-0007
- [x] The README lists `moth open` and the CHANGELOG has an entry

## As built

All six sub-tickets landed, one commit each. The spec now says the CLI is the only interface that *writes*, lists `open` in the command surface, notes that `moth open` listens on `127.0.0.1` without contacting the network, adds the request handler as a second test seam beside `run(argv, io)`, and points "A TUI" in Out of Scope at ADR-0007. The README describes `moth open` and lists it among the commands. The CHANGELOG's Unreleased section has the feature under Added and the unreadable-ticket crash under Fixed.

Where it differs from the plan: making the problems banner survive a broken ticket meant fixing the CLI first, since one file with broken frontmatter crashed every command (see ce26fb). The Moth Method does not mention `moth open`, as ADR-0007 decided.
