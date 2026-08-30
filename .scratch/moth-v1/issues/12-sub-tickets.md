# 12: Sub-tickets

**What to build:** An agent decomposing a large ticket has somewhere structured to put the pieces, with the hierarchy kept shallow and always traversable.

**Blocked by:** 09 (moth edit)

**Status:** ready-for-agent

- [x] A ticket can be given a parent at creation or by editing
- [x] A ticket has at most one parent
- [x] Giving a sub-ticket a child of its own is rejected, holding nesting to one level
- [x] A parent assignment that would form a cycle is rejected at write time
- [x] Listing makes parent and child relationships visible
