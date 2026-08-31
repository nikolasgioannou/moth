---
id: 20
title: Sequential ticket ids
status: done
priority: none
labels: []
created_at: 2026-08-30T23:31:01.428Z
updated_at: 2026-08-30T23:31:02.587Z
blocked_by:
  - 4
  - 5
---

**What to build:** A ticket is identified by a number, and its file is named `NNN-slug.md`, so a directory listing reads in order and a person can say "ticket 20" out loud. This replaces the prefixed random id (`MOTH-7f3a`) decided in ADR-0001.

**Note:** Must land before 06 (ID resolution), whose criteria assume a random suffix and prefix matching. The trade being accepted: two branches can independently allocate the same number, and git will merge both files cleanly because their slugs differ. That is tolerable only because it is detectable — see the duplicate-reporting criterion below.

- [x] A new ticket takes the next unused number, derived from the tickets already on disk
- [x] Numbers are zero-padded to three digits so a directory listing sorts correctly past ninety-nine
- [x] A ticket's file is named `NNN-slug.md` and its frontmatter records the same number
- [x] Two tickets sharing a number are reported rather than silently tolerated, on read
(Renumbering a duplicate rewrites every reference: moved to ticket 14, where the renumber command lives.)
- [x] ~~Whether an id prefix is used at all is a config choice, defaulting to none~~ superseded by ticket 26: the prefix was removed
- [x] ADR-0001 is superseded by a new ADR recording why the earlier reasoning no longer holds
- [x] The spec's ticket shape and Out of Scope entries reflect the new scheme
