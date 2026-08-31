---
status: accepted
---

# Random hex ticket ids, superseding ADR-0004

Tickets are identified by six random hex characters and stored as `a3f8c1-slug.md`. ADR-0004 chose sequential numbering; this reverses it, and it is the second reversal on this decision, so the reasoning matters more than usual.

## Which premises changed

ADR-0004 rested on three. Two no longer hold.

**A single writer on one checkout.** moth was aimed at one developer plus agents, largely on one branch, and its own history bore that out: thirty tickets, one branch, no merge commits. It is now aimed at multi-agent work and several people in one repository, where concurrent creation on separate branches is ordinary rather than hypothetical. That is precisely the case sequential numbering cannot survive, because two branches allocate the same number with no coordination and git merges both files cleanly.

**Ordering is valuable.** It is not, in practice. Tickets are found through `moth list` and opened from there; a directory listing is read to identify a ticket, not to sequence one. Ordering was the only thing a sequential number bought over a random one, and nobody was spending it.

**Filenames are read by humans.** This one still holds, and it is why the slug stays. `a3f8c1-fix-the-login-redirect.md` keeps every part anyone actually reads.

## Considered options

[beads](https://github.com/gastownhall/beads), which aims squarely at multi-agent work, uses hash ids for exactly this reason. Its ids are database keys with no filename to live in, so it pays nothing for opacity; moth pays a little and the slug covers it.

Six characters rather than four: with local collision checking only concurrent creations can clash, and for a team filing twenty tickets across branches in a week the odds fall from roughly 0.6% to 0.002%. No prefix, for the reason ticket 026 established: a repo-local tracker has nothing to disambiguate against.

## Consequences

**Ordering now comes from the creation timestamp**, with the id as a tiebreak so two tickets created in the same millisecond still sort deterministically — which agents do.

**Prefix matching returns.** Ticket 006 removed it because for numbers `1` would mean "1, or 10, or 100". For hex, an unambiguous leading fragment is meaningful again, so `moth show a3f` resolves.

**Ids are always written quoted.** An id like `22739e` is a plain string to one YAML writer and a number to another parser, which silently drops the trailing character. Quoting removes the ambiguity for every reader, not only the one moth happens to use. This was found by a test that parses tickets with a different YAML implementation than the one that writes them — the disagreement is the point of keeping them separate.
