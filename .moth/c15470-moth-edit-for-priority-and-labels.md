---
id: "c15470"
title: moth edit for priority and labels
status: done
priority: none
labels: []
created_at: 2026-08-30T23:31:01.075Z
updated_at: 2026-08-30T23:31:01.908Z
blocked_by:
  - "356aea"
---

**What to build:** A developer or agent changes a ticket's priority and labels after creation, with the same validation that applies at creation.

- [x] A ticket's title can be changed
- [x] Changing a title renames the file so its slug matches, and the ticket keeps its number
- [x] A title cannot be cleared to empty
- [x] Priority is settable to any legal value and rejected otherwise, with the legal values listed
- [x] Labels can be added and removed, and are free-form
- [x] Editing prints the updated ticket
- [x] Setting a value that is already set exits 0 rather than erroring
- [x] The updated timestamp changes on a real edit
