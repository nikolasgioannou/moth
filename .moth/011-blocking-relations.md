---
id: 11
title: Blocking relations
status: done
priority: none
labels: []
created_at: 2026-08-30T23:31:01.122Z
updated_at: 2026-08-30T23:31:02.046Z
blocked_by:
  - 9
  - 10
---

**What to build:** A ticket records what must finish before it can start, and a developer can ask what is actually startable right now.

- [x] A ticket records the tickets that block it
- [x] Viewing a blocking ticket shows what it blocks, derived at read time rather than stored
- [x] Only the forward direction is ever written to disk
- [x] A reference to a ticket that does not exist produces a warning and does not fail the command
- [x] Blocked and unblocked filters work, where blocked means at least one blocker is not in a terminal category (completed, canceled, duplicate)
