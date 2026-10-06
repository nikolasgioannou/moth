---
id: "471d5e"
title: Status columns page
status: done
priority: medium
labels:
  - web
parent: "095fa5"
created_at: 2026-10-06T20:57:54.394Z
updated_at: 2026-10-06T21:11:26.639Z
blocked_by:
  - "f0fc70"
---

Tickets laid out in one column per status, in config order.

**What to build**

- One column per status, in the order `moth.config.yml` declares them, with the category shown
- A card shows title, id, priority, labels, and how many sub-tickets are done out of how many
- Blocked tickets are marked as blocked, naming their outstanding blockers on hover
- Terminal columns (completed, canceled, duplicate) are collapsed to a count by default
- Within a column, the same order as `moth list`: priority, then age

**Done when**

- [x] A repo with a custom status shows it as its own column, in config order
- [x] A card's blocked marker matches `moth list --unblocked` exactly
- [x] Cards in a column are in the same order as `moth list --status <it>`

## As built

Which tickets are blocked comes from `/api/tickets?blocked`, which is `moth list --blocked`, so the marker cannot disagree with the CLI; the page only works out which blockers to name on hover. Column order is the schema's, then any status a ticket uses that config no longer declares, as `moth list` does. Cards keep `moth list`'s order.

Sub-ticket progress counts direct sub-tickets in any terminal category, so a canceled sub-ticket counts as finished, as it does for blocking. A finished column the reader opens stays open across redraws for the life of the page. Inline `style` attributes are refused by the content security policy, so the progress bar is sized through the CSSOM.
