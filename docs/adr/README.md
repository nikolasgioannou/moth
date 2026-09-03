# Architecture decision records

One file per decision, numbered in order: `NNNN-slug.md`.

A decision is worth recording when all three hold: it is hard to reverse, it is surprising without context, and it was a real trade-off with alternatives that were considered. If any is missing, skip it.

Each record states the decision in the present tense, the alternatives that lost and why, and the consequences accepted. The reasoning is the point: a future reader should be able to tell whether a decision still holds by checking whether its premises still hold.

## The records

| | Decision | Status |
| --- | --- | --- |
| [0001](0001-flat-ticket-directory.md) | Tickets live in one flat directory, with status in frontmatter | accepted |
| [0002](0002-bun-over-a-native-binary.md) | TypeScript on Bun, despite native being measurably faster | accepted |
| [0003](0003-random-hex-ticket-ids.md) | Ticket ids are six random hex characters | accepted |
| [0004](0004-filenames-track-the-title.md) | A ticket's filename tracks its title | accepted |

Consult this table rather than following links between records. It is what tells you which decisions are current, so a superseded record is never mistaken for one, however long a chain of reversals grows.

## Superseding

**An accepted record is never rewritten and never deleted.** It states what was decided, on the evidence available then. Editing it destroys the only thing it exists to preserve: a reader's ability to see what was believed, and what changed. Correcting a typo is fine; changing the substance of a decision is not.

A reversal gets a **new record** that supersedes the old one. The superseded record gains two things:

- `status: superseded by ADR-NNNN` in its frontmatter, and
- **a note in its prose, directly under the title**, saying so.

Frontmatter alone is not enough. A record's body is written in the present tense — "ids *are* a random suffix" — so anyone who skims three lines of YAML reads it as a description of how the project works today. A record once sat in exactly that state and was mistaken for current behaviour.

The new record names the one it supersedes in its title, so the link is followable in both directions, and the table above is updated so neither has to be followed at all.
