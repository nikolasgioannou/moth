---
id: "e74b8a"
title: Removing a ticket's last blocker does nothing
status: todo
priority: urgent
labels:
  - cli
created_at: 2026-10-03T16:33:21.288Z
updated_at: 2026-10-03T16:33:21.310Z
---

`moth edit <ticket> --unblock <blocker>` exits 0 and prints the ticket, but when the blocker is the ticket's only one, it stays in the file. Removing one of two blockers works.

```
$ moth edit b --blocked-by a
$ moth edit b --unblock a      # exit 0
$ grep -A1 blocked_by .moth/b-*.md
blocked_by:
  - "a"
```

The cause is in `src/commands/edit.ts`: the saved ticket spreads `...ticket`, which carries the old `blocked_by`, and then adds `blocked_by` only when the new list is non-empty. An empty list therefore never overwrites the old one. There is no test of `--unblock` anywhere in the suite, which is how this shipped.

Found while restructuring moth's own tickets: a blocker that looked removed was still there, the ticket it named was then deleted, and moth offered no way to repair the result.

**Related gaps that turned one bug into a stuck store**

- `--unblock` refuses an id with no ticket behind it ("no blocker matches"), so a dangling blocker cannot be removed through moth at all. It should match the raw ids in `blocked_by` before resolving against tickets
- `moth check --fix` reports a dangling blocker and leaves it alone. Dropping a blocker whose ticket does not exist loses nothing, so `--fix` should remove it and say so
- `moth delete` removes a ticket that others are blocked by, or are children of, without a word. It should refuse and name the dependents, or remove the references and report them

**Worth knowing**

Check every other field that can be cleared for the same spread pattern. `parent` is the obvious candidate; there is no way to clear it today.

**Done when**

- [ ] Removing a ticket's last blocker removes `blocked_by` from the file
- [ ] `--unblock` removes a dangling id
- [ ] `moth check --fix` removes dangling blockers and reports each one
- [ ] `moth delete` does not silently leave dangling references behind
- [ ] Tests cover `--unblock` for one blocker, several, and a dangling one
