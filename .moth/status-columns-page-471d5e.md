---
id: "471d5e"
title: Status columns page
status: todo
priority: medium
labels:
  - web
parent: "095fa5"
created_at: 2026-10-06T20:57:54.394Z
updated_at: 2026-10-06T20:57:54.911Z
blocked_by:
  - "f0fc70"
---

Tickets laid out in one column per status, in config order.

**What to build**

- One column per status, in the order `moth.config.yml` declares them, with the category shown
- A card shows title, id, priority, labels, and how many sub-tickets are done out of how many
- Blocked tickets are marked as blocked, naming their outstanding blockers on hover
- Terminal columns (completed, canceled, duplicate) are collapsed to a count by default
- Within a column, the same order as `moth list`: priority, then age

**Done when**

- [ ] A repo with a custom status shows it as its own column, in config order
- [ ] A card's blocked marker matches `moth list --unblocked` exactly
- [ ] Cards in a column are in the same order as `moth list --status <it>`
