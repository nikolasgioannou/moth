---
id: "296b9b"
title: Pages update live as tickets change
status: done
priority: high
labels:
  - web
parent: "095fa5"
created_at: 2026-10-06T20:57:54.590Z
updated_at: 2026-10-06T21:17:13.927Z
blocked_by:
  - "f0fc70"
---

The reason `moth open` is a server and not a file: when an agent runs `moth move` in a terminal, the open page shows it without a reload.

**What to build**

- Watch the ticket directory and `moth.config.yml` for changes
- Push changes to every open page over server-sent events
- Each page re-renders what changed, keeping scroll position and any open filters
- A burst of writes, such as `moth check --fix` renaming many files, is coalesced rather than re-rendering per file
- If the connection drops, the page says so and reconnects

**Done when**

- [x] `moth move <ticket> done` in a terminal moves the card on an open page within a second, without a reload
- [x] A ticket created, renamed or deleted from the CLI appears, updates or disappears on the page
- [x] Changing a status in `moth.config.yml` updates the columns
- [x] Stopping and restarting the server, the page reconnects on its own

## As built

The server watches the ticket directory, and the repo root for `moth.config.yml` (the directory rather than the file, so an editor that saves by replacing the file does not orphan the watch). Watching starts when the first page connects to `/api/events`, a server-sent event stream. Writes settle for 75ms before a notice goes out, and a steady stream of writes still produces one at least every 500ms, so 30 files written at once arrive as one or two notices.

A notice carries no data: the page redraws its current view from the API, keeping the page's and the columns' scroll position, the filters (which live in the URL), and focus in the search box. A redraw that finishes after a newer one is dropped. A comment line every five seconds keeps the stream under Bun's idle timeout.

The header shows "live", or "disconnected, reconnecting…" when the server goes away. The stream asks the browser to retry every second, and the first connection after a loss redraws, so a restarted server is picked up along with anything that changed while it was down. Checked by hand: moving and filing tickets from the CLI updated an open page without a reload, and stopping the server, changing a ticket, and restarting it brought the page back up to date.
