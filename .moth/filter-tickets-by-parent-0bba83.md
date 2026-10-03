---
id: "0bba83"
title: Filter tickets by parent
status: done
priority: medium
labels:
  - cli
created_at: 2026-10-03T16:32:30.742Z
updated_at: 2026-10-03T16:39:14.049Z
---

Parent tickets are how a project groups work into milestones or features: the parent's title names the group, its body describes it, and its children are the members. A project tracked with moth wanted exactly this, and asked for a separate milestones concept because it could not ask moth "what is left in M8?".

`moth list` makes parent relationships visible but cannot filter by them.

**What to build**

- `moth list --parent <ticket>`: the parent's children, resolving the ticket as every other command does. Multi-value, like the other filters
- `--parent none` for tickets with no parent
- `moth board` takes it too, as it takes every list filter
- If deeper nesting lands (see the nesting ticket), `--parent` matches direct children only; whether to add a descendants form is that ticket's call

**Done when**

- [x] `moth list --parent <ticket>` lists only its children
- [x] `--parent none` lists only top-level tickets
- [x] An unknown parent exits 1 rather than printing an empty list
- [x] `moth board` accepts it

## As built

`filterOrReport` in `src/query.ts` resolves `--parent` values before filtering, so `list` and `board` can refuse an unknown parent with exit 1. The literal `none` is checked before resolution, so it always means "no parent", even if a ticket title contains the word. Matching is direct children only, as the nesting ticket will need to revisit.
