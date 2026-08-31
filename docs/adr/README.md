# Architecture decision records

One file per decision, numbered in order: `NNNN-slug.md`.

A decision is worth recording when all three hold: it is hard to reverse, it is
surprising without context, and it was a real trade-off with alternatives that
were considered. If any is missing, skip it.

## Superseding

A decision that gets reversed is **not** rewritten or deleted. The reasoning is
the point, including the reasoning that turned out to be wrong: a future reader
should be able to see what was believed and what changed.

Instead, the superseded record gains two things:

- `status: superseded by ADR-NNNN` in its frontmatter, and
- **a note in its prose, directly under the title**, saying so.

Frontmatter alone is not enough. An ADR's body is written in the present tense —
"IDs *are* a random suffix" — so anyone who skims past three lines of YAML reads
it as a description of how the project works today. ADR-0001 sat in exactly that
state and was mistaken for current behaviour.

The new record names the one it supersedes in its title, so the link is
followable in both directions.
