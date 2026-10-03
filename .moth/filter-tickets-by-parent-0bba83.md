---
id: "0bba83"
title: Filter tickets by parent
status: todo
priority: medium
labels:
  - cli
created_at: 2026-10-03T16:32:30.742Z
updated_at: 2026-10-03T16:32:30.825Z
---

Parent tickets are how a project groups work into milestones or features: the parent's title names the group, its body describes it, and its children are the members. A project tracked with moth wanted exactly this, and asked for a separate milestones concept because it could not ask moth "what is left in M8?".

`moth list` makes parent relationships visible but cannot filter by them.

**What to build**

- `moth list --parent <ticket>`: the parent's children, resolving the ticket as every other command does. Multi-value, like the other filters
- `--parent none` for tickets with no parent
- `moth board` takes it too, as it takes every list filter
- If deeper nesting lands (see the nesting ticket), `--parent` matches direct children only; whether to add a descendants form is that ticket's call

**Done when**

- [ ] `moth list --parent <ticket>` lists only its children
- [ ] `--parent none` lists only top-level tickets
- [ ] An unknown parent exits 1 rather than printing an empty list
- [ ] `moth board` accepts it
