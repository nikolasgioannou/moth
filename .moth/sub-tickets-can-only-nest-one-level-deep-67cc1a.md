---
id: "67cc1a"
title: Sub-tickets can only nest one level deep
status: done
priority: medium
labels:
  - cli
created_at: 2026-10-03T16:32:30.771Z
updated_at: 2026-10-03T16:40:42.766Z
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

- [x] A sub-ticket can have sub-tickets, to any depth
- [x] A parent that would form a cycle is refused at write time, with a message naming the cycle
- [x] `moth check` reports a cycle on disk
- [x] `moth list` shows nesting depth
- [x] An ADR records the reversal of the one-level decision

## As built

`parentProblem` now refuses only a self-parent, a missing parent, or a cycle, naming it (`a -> c -> b -> a`). `ancestorsOf` and `parentCycle` in `src/ticket.ts` both stop on a repeat, so a cycle that arrives by hand edit cannot hang a command; `moth check` reports each cycle once.

`moth list` shows the whole chain of parents on a sub-ticket's row, outermost first (`↳ m8 › browser`), rather than indenting. A missing parent still shows as the id the file names.

`moth edit --parent none` clears a parent, closing the gap noted in `e74b8a`.

ADR-0005 records the reversal. The one-level rule lived in the spec, not an ADR, so the spec now points at it; its out-of-scope "nesting beyond one level" entry is gone.
