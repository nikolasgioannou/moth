---
id: "759ce0"
title: Link commits to tickets
status: backlog
priority: low
labels:
  - cli
created_at: 2026-10-03T16:22:02.491Z
updated_at: 2026-10-03T16:22:02.491Z
---

"Move the ticket to done in the same commit as its work" was a convention in one project, and nothing checked it.

An opt-in check could: a `Ticket: <id>` trailer in the commit message, and a `commit-msg` hook command (`moth check --commit-msg <file>`) that verifies the trailer names an existing ticket and that the commit touches that ticket's file.

Filed to record the idea, not committed to. Worth building only if another project asks for it.
