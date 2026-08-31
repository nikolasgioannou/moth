---
status: accepted
---

# Ticket ids are six random hex characters

A ticket is identified by six random hex characters — `a3f8c1`. The id is opaque, carries no ordering, and never changes once assigned.

## Considered options

**Sequential numbers** (`1`, `2`, `3`) are the obvious alternative and are better on ergonomics: `42` is easy to say aloud, easy to type, and sorts into the order tickets were filed. They were rejected because allocating them needs coordination moth does not have.

The failure is silent, which is what settles it. moth has no server; each checkout allocates from what it can see. Two branches both create the next ticket, both pick `42`, and because filenames carry a title-derived slug the two files have *different names*. Git merges them cleanly and reports no conflict. The result is two tickets sharing an id, discovered whenever someone finally runs `moth check` — or never. A loud failure can be fixed; a silent one corrupts quietly.

That argument only bites in a repository with several writers, which is exactly what moth targets: multi-agent work, and several people filing tickets across branches. In a single-writer repository the collision cannot happen and numbers would be the better choice.

**Ordering** is the one thing a sequential number buys that a random id cannot, and in practice nobody spends it. Tickets are found through `moth list` and opened from there; a directory listing is read to identify a ticket, not to sequence one. Ordering comes from the creation timestamp instead.

**Six characters rather than four.** With local collision checking only concurrent creations can clash. For a team filing twenty tickets a week across branches, the odds fall from roughly 0.6% to 0.002%.

**No configured prefix** (`MOTH-a3f8c1`). A repo-local tracker has nothing to disambiguate against, so a prefix is decoration every reference has to carry.

[beads](https://github.com/gastownhall/beads), which aims squarely at multi-agent work, reaches for hash ids for the same reason. Its ids are database keys with no filename to live in, so it pays nothing for opacity; moth pays a little, and the slug in the filename covers it.

## Consequences

**Ordering comes from the creation timestamp**, with the id as a tiebreak so two tickets created in the same millisecond still sort deterministically — which agents do.

**A reference resolves by unambiguous prefix.** `moth show a3f` finds `a3f8c1` when nothing else starts that way, so an id rarely has to be typed in full. Titles resolve too: `moth show "fix the login"`.

**Ids are always written quoted.** An id like `22739e` is a plain string to one YAML writer and a number to another parser, which silently drops the trailing character. Quoting removes the ambiguity for every reader, not only the one moth happens to use. This was found by a test that parses tickets with a different YAML implementation than the one that writes them — the disagreement is the point of keeping them separate.
