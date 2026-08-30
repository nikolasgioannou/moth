# 23: A ticket must have a title

**What to build:** Filing a ticket without a title fails and explains why, instead of quietly producing a ticket that lists as a blank row. Today `moth new` with no argument exits 0 and writes `002.md` with an empty title.

**Blocked by:** 04 (moth new)

**Note:** "No ticket without a title" was agreed during design as one of the opinions worth keeping, and then never made it into the spec — which is why the behaviour was never built. Recorded here so the decision stops being lore.

**Status:** ready-for-agent

- [x] Creating a ticket with no title exits 2 and writes no file
- [x] The error states that a title is required
- [x] A title of only whitespace is rejected the same way
- [x] The spec records that a ticket cannot exist without a title
