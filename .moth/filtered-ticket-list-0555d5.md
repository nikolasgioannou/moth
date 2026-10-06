---
id: "0555d5"
title: Filtered ticket list
status: done
priority: medium
labels:
  - web
parent: "095fa5"
created_at: 2026-10-06T20:57:54.492Z
updated_at: 2026-10-06T21:14:24.027Z
blocked_by:
  - "f0fc70"
---

The list view, filtered with the same words as `moth list`.

**What to build**

- A table of tickets with status, priority, labels, parent, and blocked
- Filters for status, category, priority, label, parent and unblocked, matching `moth list`'s flags and semantics, including repeated values
- Filters live in the query string, so a filtered view can be bookmarked and shared

**Done when**

- [x] For each filter, the rows match `moth list` with the equivalent flags, asserted by a test
- [x] Reloading a filtered URL shows the same rows

## As built

The filters are a form beside the table: checkbox groups for status, category, priority and labels, a parent picker listing tickets that have sub-tickets plus "none", a search box, and any/blocked/unblocked. Every change rewrites the query string with `history.replaceState`, one parameter per checked box, so `?status=todo&status=done` is `moth list --status todo --status done`; reloading or bookmarking a URL restores both the form and the rows.

The server turns only `moth list`'s filter names into flags and ignores any other parameter. A filter moth refuses comes back with moth's own message: an unknown parent is a 422 and a repeated single-value filter a 400. Labels are labelled "has all of", since `--label` matches every label given.

A redraw keeps focus and the caret in the search box, so typing is not interrupted.
