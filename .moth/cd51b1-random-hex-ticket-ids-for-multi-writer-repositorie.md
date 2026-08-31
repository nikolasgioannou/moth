---
id: "cd51b1"
title: Random hex ticket ids, for multi-writer repositories
status: done
priority: none
labels: []
created_at: 2026-08-31T02:47:59.112Z
updated_at: 2026-08-31T03:04:27.750Z
---

**What to build:** A ticket is identified by six random hex characters — `a3f8c1-fix-the-login-redirect.md` — replacing the sequential numbering of ticket 020 and ADR-0004.

**Blocked by:** 20 (sequential ticket ids)

**Note:** This is the third position on ids, so the reasoning matters. ADR-0004 chose sequential on three premises, two of which have since changed:

- *A single writer on one checkout.* moth is now aimed at multi-agent teams, and possibly several people in one repository. Concurrent creation on separate branches becomes ordinary rather than hypothetical, and that is exactly the case sequential numbering cannot survive.
- *Ordering is valuable.* It is not, in practice. Tickets are found through `moth list` and opened from there; the directory listing is read for identification, not sequence. Ordering was the only thing the number bought.
- *Filenames are read by humans.* Still true — and the slug carries that, not the number. `a3f8c1-fix-the-login-redirect.md` keeps every readable part.

beads, which is aimed squarely at multi-agent work, uses hash ids for this reason. Its ids are pure database keys with no filename to live in, so it pays nothing for opacity; moth pays a little, and the slug covers it.

Six characters rather than four: with local collision checking only concurrent creations can clash, and for a team filing twenty tickets across branches in a week the odds fall from roughly 0.6% to 0.002%. No prefix: a repo-local tracker has nothing to disambiguate against, which is what ticket 026 established.

- [x] A new ticket takes a random six-character hex id, checked against the ids already on disk
- [x] A ticket's file is named `<id>-<slug>.md` and its frontmatter records the same id
- [x] Prefix matching returns: an unambiguous leading fragment of an id resolves, since it is meaningful again for hex
- [x] Ordering falls back to creation time, which the id no longer encodes
- [x] `blocked_by` and `parent` hold ids, and existing tickets are migrated with their graph intact
- [x] Two tickets sharing an id are still reported, and `check --fix` reissues one
- [x] ADR-0004 is superseded by a new ADR recording which premises changed
- [x] The spec, CONTEXT.md and the README reflect the new scheme
