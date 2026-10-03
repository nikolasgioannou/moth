---
status: accepted
---

# Sub-tickets nest to any depth

A ticket's `parent` may itself have a parent, to any depth. The one rule left is that the hierarchy stays a tree: a parent that would put a ticket under itself, directly or through its descendants, is refused at write time, and `moth check` reports a cycle that arrives by hand edit.

## Considered options

**One level only** was the v1 decision, on the grounds that arbitrary trees complicate every list view and traversal for a case that rarely earns it. Both halves of that have since changed. The case earned it: a 163-ticket project tracked with moth needed milestones, and parent tickets are how moth groups work, so a milestone is a parent. One level then stops at milestone → ticket, and a feature inside a milestone cannot be broken down at all. The cost turned out small: `moth list` shows a sub-ticket's whole chain of parents on its row (`↳ m8 › browser`), which reads at any depth without indenting, and the traversal is one walk up a parent chain that stops on a repeat.

**A separate milestone concept**, an ordered list in config with a field on each ticket, was proposed by the same project and rejected. It is a second grouping mechanism beside parents, needs its own commands and validation, and its one extra feature, ordering, is better left to blockers between the milestone tickets and to priority. The spec already rules out manual ordering.

**A fixed depth limit** of two or three levels was rejected as arbitrary: any number picked is the wrong one for somebody, and the cycle check is needed whatever the limit.

One level also ruled out cycles for free, since a ticket could not be both a parent and a child. That guarantee is now an explicit check rather than a side effect of the depth rule.

## Consequences

`moth list --parent` matches direct children only. A milestone's progress across several levels needs a descendants form, to add when a real tree asks for it.

Two behaviours that trees invite are deliberately not taken on: a ticket does not count as blocked because an ancestor is, and a parent does not close when its children do. moth changes no status it was not asked to change.

A parent can be cleared with `moth edit <ticket> --parent none`.
