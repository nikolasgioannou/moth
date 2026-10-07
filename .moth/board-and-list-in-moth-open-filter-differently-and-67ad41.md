---
id: "67ad41"
title: Board and list in moth open filter differently and look inconsistent
status: done
priority: medium
labels:
  - web
parent: "095fa5"
created_at: 2026-10-07T15:26:40.133Z
updated_at: 2026-10-07T15:28:07.517Z
---

The board and the list are separate pages reached from a sidebar, only the list can be filtered, and the board's finished columns collapse to a different width from the rest. The sidebar adds a logo and navigation the page does not need.

**What to build**

- No sidebar: the page is the tickets, full width
- One Tickets page with a Board/List switch in its header, keeping the filters when switching
- The same filter bar on both views, with the same query string, so a filtered board and a filtered list show the same tickets
- On the board, a status or category filter limits the columns to the statuses it names; with neither, every status has a column
- Every column the same width, none collapsible
- The live indicator stays visible somewhere on every page

**Done when**

- [x] There is no sidebar, at any width
- [x] `/?label=web` and `/list?label=web` show the same tickets, and the switch carries the filters across
- [x] Every board column is the same width and none can collapse
- [x] Every existing test passes

## As built

The sidebar is gone, and with it the logo and the parents list; the parent filter covers what the list did. The live indicator is a pill fixed in the bottom-right corner.

`/` is the board and `/list` the list, one Tickets page with a Board/List switch whose links carry the query string, so the filters survive the switch. Both views draw the same filter bar and fetch `/api/tickets` with the same query, and show "n of total". The board's All/Active/Backlog tabs were dropped, since the category filter does the same job.

Columns are all 290px and none collapses, which reverses 471d5e's collapsed finished columns. A status or category filter limits the board to the statuses it names; otherwise every status has a column.
