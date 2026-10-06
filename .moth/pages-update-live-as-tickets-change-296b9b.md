---
id: "296b9b"
title: Pages update live as tickets change
status: todo
priority: high
labels:
  - web
parent: "095fa5"
created_at: 2026-10-06T20:57:54.590Z
updated_at: 2026-10-06T20:57:54.779Z
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

- [ ] `moth move <ticket> done` in a terminal moves the card on an open page within a second, without a reload
- [ ] A ticket created, renamed or deleted from the CLI appears, updates or disappears on the page
- [ ] Changing a status in `moth.config.yml` updates the columns
- [ ] Stopping and restarting the server, the page reconnects on its own
