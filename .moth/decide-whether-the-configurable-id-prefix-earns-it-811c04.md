---
id: "811c04"
title: Decide whether the configurable id prefix earns its keep
status: done
priority: none
labels: []
created_at: 2026-08-30T23:51:46.473Z
updated_at: 2026-08-31T00:32:40.652Z
---

**What to build:** A decision, and whatever follows from it, about `prefix` in `moth.config.yml`.

It is not vestigial: it is read by `formatId` and stripped by `resolve`, it works, and it is covered by tests. It exists because ticket 20 required that "whether an id prefix is used at all is a config choice, defaulting to none".

But it has never been asked for by a user, its default is empty so most repos never see it, and it is threaded as a parameter through every single command. The original justification for prefixes belonged to the random-id scheme, where `MOTH-7f3a` needed a namespace; with sequential numbers inside a repo-local tracker there is no cross-project collision to disambiguate.

Keep it if the "ENG-020 in a commit message" case is worth the parameter; remove it if not. Either way the decision should be written down rather than left as something nobody remembers choosing.

- [x] A decision is recorded, with its reasoning
- [x] If removed, `formatId` and `resolve` lose the parameter and every command stops threading it
- [x] ~~If kept, the config comment explains when someone would want it~~ not applicable: it was removed
