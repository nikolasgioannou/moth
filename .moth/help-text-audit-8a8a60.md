---
id: "8a8a60"
title: Help text audit
status: done
priority: none
labels: []
created_at: 2026-08-30T23:31:01.337Z
updated_at: 2026-08-30T23:31:02.367Z
blocked_by:
  - "b89844"
  - "8788ed"
  - "2a1b65"
---

**What to build:** An agent that has never seen moth before can learn to use it correctly from help output alone. No skill ships with moth, so this is the whole of its usage guidance and a release requirement rather than polish.

- [x] Every command's help contains at least one worked example with realistic values
- [x] Help documents what each exit code means
- [x] Top-level help lists every command with a one-line description
- [x] Help is reachable from the top level and from every subcommand
- [x] Given only the help output, an agent can initialise a repo, create a ticket, find it again, and move it, without any other documentation
