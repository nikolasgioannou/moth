---
id: "67cc1a"
title: Sub-tickets can only nest one level deep
status: todo
priority: medium
labels:
  - cli
created_at: 2026-10-03T16:32:30.771Z
updated_at: 2026-10-03T16:32:30.851Z
---

`a69404` held nesting to one level, which also ruled out cycles for free. With parent tickets now the way to group work into milestones and features, that limit blocks the natural shape: milestone → feature → task. Linear, the obvious comparison, nests sub-issues several levels deep.

This reverses a deliberate decision, so it gets an ADR recording why.

**What to build**

- Remove the one-level limit on `--parent`
- A real cycle check at write time, now that the depth limit no longer provides one: a ticket cannot take one of its own descendants as a parent
- `moth list` shows depth legibly, not only one level of indentation
- `moth check` reports a cycle in hand-edited files rather than looping on it

**Worth knowing**

Two related questions are deliberately out of scope until there are real trees to look at:

- Should a ticket count as blocked when an ancestor is blocked? This would let "M9 blocked by M8" hold back M9's children in `--unblocked`. Linear does not do it.
- Should parents close when all their children do? Linear does this; moth does nothing to statuses on its own today.

**Done when**

- [ ] A sub-ticket can have sub-tickets, to any depth
- [ ] A parent that would form a cycle is refused at write time, with a message naming the cycle
- [ ] `moth check` reports a cycle on disk
- [ ] `moth list` shows nesting depth
- [ ] An ADR records the reversal of the one-level decision
