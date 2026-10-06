---
id: "0555d5"
title: Filtered ticket list
status: todo
priority: medium
labels:
  - web
parent: "095fa5"
created_at: 2026-10-06T20:57:54.492Z
updated_at: 2026-10-06T20:57:55.004Z
blocked_by:
  - "f0fc70"
---

The list view, filtered with the same words as `moth list`.

**What to build**

- A table of tickets with status, priority, labels, parent, and blocked
- Filters for status, category, priority, label, parent and unblocked, matching `moth list`'s flags and semantics, including repeated values
- Filters live in the query string, so a filtered view can be bookmarked and shared

**Done when**

- [ ] For each filter, the rows match `moth list` with the equivalent flags, asserted by a test
- [ ] Reloading a filtered URL shows the same rows
