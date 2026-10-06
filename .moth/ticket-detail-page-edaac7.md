---
id: "edaac7"
title: Ticket detail page
status: done
priority: medium
labels:
  - web
parent: "095fa5"
created_at: 2026-10-06T20:57:54.444Z
updated_at: 2026-10-06T21:13:15.442Z
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

- [x] A ticket three levels deep shows all three ancestors and its own sub-tickets
- [x] A body containing code fences, tables and task lists renders without raw markdown leaking through
- [x] Renaming a ticket with `moth edit --title` leaves its URL working

## As built

Bodies are rendered on the server by `Bun.markdown`, so no markdown library was added. Raw HTML in a body is shown as text and `javascript:` links lose their target, on top of the content security policy. `/api/tickets/<id>/body` serves the HTML; the ticket itself still comes from `moth show --json`.

The fields table shows every frontmatter field the header and sections do not, which covers declared custom fields and the file path. The commands section has `moth move` with a status picker, `moth show`, and `moth edit --body-file -`, each with a copy button.

A relative link in a body, such as one to an ADR, is left to the server, which answers 404, rather than being swallowed by the page's own routing.

Checked by hand against a four-level chain: breadcrumbs, the tree, blockers and a custom field all render. The three-level done-when was verified that way; the rendering and rename criteria are tests.
