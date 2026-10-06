---
id: "edaac7"
title: Ticket detail page
status: todo
priority: medium
labels:
  - web
parent: "095fa5"
created_at: 2026-10-06T20:57:54.444Z
updated_at: 2026-10-06T20:57:54.957Z
blocked_by:
  - "f0fc70"
---

Everything about one ticket on one page.

**What to build**

- The body rendered as markdown, with checkboxes shown but not clickable
- Breadcrumbs up through every ancestor, and the sub-ticket tree below, to any depth
- Blockers, and the tickets this one blocks, each linking to its own page and showing its status
- Every frontmatter field, including declared custom fields
- A copyable `moth` command for the common next steps: move, show, and edit
- A stable URL by id, so a link to a ticket survives a rename

**Done when**

- [ ] A ticket three levels deep shows all three ancestors and its own sub-tickets
- [ ] A body containing code fences, tables and task lists renders without raw markdown leaking through
- [ ] Renaming a ticket with `moth edit --title` leaves its URL working
