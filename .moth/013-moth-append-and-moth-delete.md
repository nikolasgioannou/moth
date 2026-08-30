---
id: 13
title: moth append and moth delete
status: done
priority: none
labels: []
created_at: 2026-08-30T23:31:01.169Z
updated_at: 2026-08-30T23:31:02.140Z
blocked_by:
  - 7
---

**What to build:** An agent records findings on a ticket mid-task without rewriting the file, and a genuine mistake can be removed rather than living in the backlog forever.

- [x] Text piped to append is added under a notes heading, leaving the rest of the file untouched
- [x] Appending twice accumulates rather than replaces
- [x] Multi-line markdown survives an append unaltered
- [x] Delete removes the ticket's file
- [x] Delete requires an explicit confirmation flag, so an agent cannot delete by accident, and does not prompt
- [x] Delete's help text points at cancelling as the normal path
