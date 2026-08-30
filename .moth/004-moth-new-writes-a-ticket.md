---
id: 4
title: moth new writes a ticket
status: done
priority: none
labels: []
created_at: 2026-08-30T23:31:00.677Z
updated_at: 2026-08-30T23:31:01.660Z
blocked_by:
  - 3
---

**What to build:** An agent or a developer files a ticket with nothing but a title, and it lands on disk as a well-formed file that later commands can read.

- [x] Creating a ticket with only a title succeeds and writes exactly one file
- [x] ~~The ID uses the configured prefix and a random suffix~~ superseded by ticket 20: ids are sequential
- [x] The filename carries both the ID and a slug derived from the title
- [x] Frontmatter records the id, title, status, priority, and both timestamps
- [x] A new ticket defaults to the first status in the backlog category, and to no priority
- [x] A description is accepted from a flag or piped on stdin, and multi-line markdown containing quotes, backticks, and code fences survives unaltered
- [x] The created ticket is printed on success, with a JSON form available
- [x] Running new outside an initialised repo fails with a message naming init as the fix
