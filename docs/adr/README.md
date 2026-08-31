# Architecture decision records

One file per decision, numbered in order: `NNNN-slug.md`.

A decision is worth recording when all three hold: it is hard to reverse, it is surprising without context, and it was a real trade-off with alternatives that were considered. If any is missing, skip it.

Each record states the decision in the present tense, the alternatives that lost and why, and the consequences accepted. The reasoning is the point: a future reader should be able to tell whether a decision still holds by checking whether its premises still hold.

## When a decision changes

While moth is pre-1.0, a record that no longer describes moth is **rewritten in place** rather than superseded. There are no supersession chains and no records describing behaviour that does not exist: a reader can take any file here as current.

Reasoning that lost is kept, as an alternative under "Considered options" rather than as a separate document. That is where it is useful — an argument that lost once may win later, and it will be found by someone reading the decision it bears on rather than by someone reading a retired file.

The history is in git. `git log -p docs/adr/` is a complete record of what was believed and when, which is what a superseded file was standing in for.

After 1.0, when others may be linking to these, reversals get their own record instead.
