---
status: accepted
---

# Tickets live in one flat directory, with status in frontmatter

All tickets live directly in the ticket directory, and a ticket's status is a frontmatter field. Status is deliberately *not* encoded as a subdirectory, despite that being the more legible layout when browsing with `ls`.

## Considered options

A directory per status is the natural instinct and was raised more than once during design. It was rejected for four reasons: it creates two sources of truth for status that can drift; it breaks single-file reads, since an agent reading one ticket could no longer see its status from the file; it turns every status change into a git rename, and rename/rename is the worst merge case — note that this is an argument about *frequency*, not about renames being expensive: [ADR-0004](0004-filenames-track-the-title.md) measures a rename as one changed line that git detects and follows, but a status rename happens many times in a ticket's life where a title rename happens rarely; and the directory names would be repo-specific, since repos define their own statuses, so no path would be portable.

The deciding argument is that status is only one of six things a caller filters on: the others are category, priority, labels, blocking, and free-text search. Privileging it in the directory structure buys legibility on one axis while costing correctness on all of them.

## Consequences

`ls` is not a useful view of the store; reading it is the CLI's job, and `moth list` has to be good enough to justify that. This is also why no central index file exists: anything every write touches would conflict on every parallel branch.
