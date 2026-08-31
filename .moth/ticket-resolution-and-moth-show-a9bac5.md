---
id: "a9bac5"
title: Ticket resolution and moth show
status: done
priority: none
labels: []
created_at: 2026-08-30T23:31:01.007Z
updated_at: 2026-08-30T23:31:01.749Z
blocked_by:
  - "d9bfc0"
---

**What to build:** A developer refers to a ticket the way they actually hold it in their head — its number, however they happen to write it, or a few words from its title — and moth either shows it or says plainly that the reference was ambiguous.

**Note:** Rewritten after ticket 20 replaced random ids with sequential numbers. Prefix matching is gone: it made sense for `MOTH-7f3a`, where a fragment narrows the field, but for numbers it would make `1` mean "1, or 10, or 100", which is worse than useless. Resolution is now an exact number, tolerant of how it is written.

- [x] A ticket is found by its number, with or without zero padding, so `20` and `020` both work
- [x] ~~A ticket is found by its number carrying the repo's configured prefix, if it uses one~~ superseded by ticket 26: the prefix was removed
- [x] A ticket is found by a fuzzy match against its title
- [x] A reference that looks like a number is never matched against titles, so `moth show 20` cannot resolve to a ticket titled "20 things to fix"
- [x] A reference matching more than one ticket exits non-zero and lists the candidates rather than guessing, including when two tickets share a number
- [x] A reference matching nothing exits non-zero, with a message distinguishing it from an ambiguous match
- [x] Show renders the ticket's metadata and its body, with a JSON form available
- [x] The JSON form includes the body, unlike list, since showing one ticket is asking for its content
