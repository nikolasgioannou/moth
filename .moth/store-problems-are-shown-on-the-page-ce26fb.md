---
id: "ce26fb"
title: Store problems are shown on the page
status: todo
priority: medium
labels:
  - web
parent: "095fa5"
created_at: 2026-10-06T20:57:54.541Z
updated_at: 2026-10-06T20:57:55.049Z
blocked_by:
  - "f0fc70"
---

What `moth check` would report, visible without running it.

**What to build**

- A banner listing `moth check` findings: dangling blockers and parents, cycles, duplicate ids, slug drift, undeclared fields, unknown statuses
- Each finding names the command that fixes it, as `moth check` does
- A ticket that fails to parse is listed rather than crashing the page

**Done when**

- [ ] A store with a dangling blocker shows the same finding `moth check` prints
- [ ] A ticket with broken frontmatter appears in the banner, and every other ticket still renders
