---
id: 5
title: moth list default view
status: done
priority: none
labels: []
created_at: 2026-08-30T23:31:00.983Z
updated_at: 2026-08-30T23:31:01.704Z
blocked_by:
  - 4
---

**What to build:** A developer sees their whole backlog at a glance, grouped and aligned, and an agent gets the same data as JSON. This is the point at which moth becomes minimally useful.

- [x] Listing shows every ticket, grouped by status
- [x] Columns stay aligned regardless of title length
- [x] The JSON form emits machine-readable output with no colour or decoration
- [x] Colour and decoration are suppressed automatically when output is not a terminal, with no flag required
- [x] Listing an empty store prints a message and exits 0 rather than printing nothing
- [x] Ticket data goes to stdout; any diagnostics go to stderr
