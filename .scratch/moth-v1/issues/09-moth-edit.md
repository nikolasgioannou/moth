# 09: moth edit for priority and labels

**What to build:** A developer or agent changes a ticket's priority and labels after creation, with the same validation that applies at creation.

**Blocked by:** 07 (statuses and move)

**Status:** ready-for-agent

- [ ] Priority is settable to any legal value and rejected otherwise, with the legal values listed
- [ ] Labels can be added and removed, and are free-form
- [ ] Editing prints the updated ticket
- [ ] Setting a value that is already set exits 0 rather than erroring
- [ ] The updated timestamp changes on a real edit
