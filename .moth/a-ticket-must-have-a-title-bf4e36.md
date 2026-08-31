---
id: "bf4e36"
title: A ticket must have a title
status: done
priority: none
labels: []
created_at: 2026-08-30T23:31:01.496Z
updated_at: 2026-08-30T23:31:02.740Z
blocked_by:
  - "d9bfc0"
---

**What to build:** Filing a ticket without a title fails and explains why, instead of quietly producing a ticket that lists as a blank row. Today `moth new` with no argument exits 0 and writes `002.md` with an empty title.

**Note:** "No ticket without a title" was agreed during design as one of the opinions worth keeping, and then never made it into the spec — which is why the behaviour was never built. Recorded here so the decision stops being lore.

- [x] Creating a ticket with no title exits 2 and writes no file
- [x] The error states that a title is required
- [x] A title of only whitespace is rejected the same way
- [x] The spec records that a ticket cannot exist without a title
