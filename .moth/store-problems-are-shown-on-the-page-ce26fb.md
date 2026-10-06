---
id: "ce26fb"
title: Store problems are shown on the page
status: done
priority: medium
labels:
  - web
parent: "095fa5"
created_at: 2026-10-06T20:57:54.541Z
updated_at: 2026-10-06T21:15:25.314Z
blocked_by:
  - "f0fc70"
---

What `moth check` would report, visible without running it.

**What to build**

- A banner listing `moth check` findings: dangling blockers and parents, cycles, duplicate ids, slug drift, undeclared fields, unknown statuses
- Each finding names the command that fixes it, as `moth check` does
- A ticket that fails to parse is listed rather than crashing the page

**Done when**

- [x] A store with a dangling blocker shows the same finding `moth check` prints
- [x] A ticket with broken frontmatter appears in the banner, and every other ticket still renders

## As built

A banner above every view lists `moth check`'s findings word for word, collapsed to a count until opened, and stays open across redraws once opened.

Making a broken ticket not crash the page meant fixing the CLI first: a single file with no frontmatter, or frontmatter that does not parse, made every command throw a stack trace. `readStore` now sets such files aside with a reason, and `readTickets` returns the tickets that could be read. `moth check` reports each one as "`<file>` cannot be read as a ticket (`<reason>`); fix its frontmatter by hand" and exits 1. `moth list` warns about each on stderr and lists the rest, and every other command works on the readable tickets. Frontmatter that parses to something other than a set of fields, such as a YAML list, counts as unreadable too.
