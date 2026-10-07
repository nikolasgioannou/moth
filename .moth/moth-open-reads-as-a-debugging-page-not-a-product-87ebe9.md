---
id: "87ebe9"
title: moth open reads as a debugging page, not a product
status: done
priority: medium
labels:
  - web
parent: "095fa5"
created_at: 2026-10-07T15:16:43.161Z
updated_at: 2026-10-07T15:22:28.221Z
---

The first pass of `moth open` works but looks unfinished: plain words where people expect status colours, columns that are hard to tell apart, and a filter column that crowds the list. It should look like the rest of the tools its user works in.

The visual language follows Winston's (Notion's): a warm grey sidebar with a hairline edge, centred page columns with a large title, raised cards with hairline rings, tinted status pills with a dot, neutral badges, and plain and ghost buttons. The board keeps one thing from Linear: each column has a background tinted by its status.

**What to build**

- A sidebar with the views and the store's top-level parent tickets, beside a white page
- Status pills tinted by category: grey for backlog, unstarted, canceled and duplicate, blue for started, green for completed; a red pill for blocked
- Columns tinted by the same tones, with raised cards
- List: rows in cards grouped by status, and filters as menus under plain buttons
- Ticket page: a back link, a large title, properties, the body, sub-tickets as rows, and the commands
- Light and dark themes

**Done when**

- [x] Every view uses the sidebar, pills, badges and cards, in light and dark
- [x] Tabs, filters and live updates behave as before, and every existing test passes unchanged
- [x] Nothing overflows sideways at phone width

## As built

Colours, shadows, radii and type sizes are Winston's tokens (themselves Notion's), declared with `light-dark()` so one set serves both themes. Icons are a handful of Lucide's, inlined with their ISC notice, since moth bundles no icon library.

Status shows as a tinted pill with a dot: grey for backlog, unstarted, canceled and duplicate, blue for started, green for completed, red for blocked or for a status config does not declare. Priority and labels are neutral badges, with urgent in red and high in amber. Columns are tinted by the same tones, fill the window's height, and scroll on their own; a redraw keeps each column's scroll position. Tabs switch between All, Active and Backlog, kept in the URL as `?show=`.

The list puts rows in cards, Winston's connected-accounts pattern, grouped by status, with filters as menus under plain buttons; a menu stays open across the redraw a change causes. The ticket page has a back link to the parent, the trail of further ancestors, the title, a property list, the body, sub-tickets as indented rows, and the commands.

An earlier pass copied Linear's look closely and was dropped; only its tinted columns were kept. Checked in the browser pane in light and dark, at desktop width and at 375px.
