---
status: superseded by ADR-0004
---

# Random ticket IDs, not sequential

> **Superseded by [ADR-0004](0004-sequential-ticket-numbers.md): moth numbers tickets sequentially.** Everything below is the decision as it stood when it was taken, kept in the tense it was written in. It is history, not a description of how moth works. In particular, the prefix matching offered under Consequences was itself later removed: for numbers it would make `1` mean "1, or 10, or 100", so a reference resolves as an exact number instead.

Ticket IDs are a configured prefix plus a random suffix (`MOTH-7f3a`), not a sequential counter (`MOTH-42`). Sequential IDs need a server to allocate them; moth has none, so two branches would allocate the same number independently.

## Considered options

Sequential numbering was the preferred option on ergonomics — `MOTH-42` is easier to say aloud and to type than `MOTH-7f3a`, and that cost is real. It was rejected because the failure is silent rather than loud: since filenames carry a title-derived slug, two branches creating `MOTH-42` with different titles produce *different filenames*, so git merges both cleanly and reports no conflict. The result is two tickets sharing an ID and no warning that it happened.

Making the collision loud would mean dropping the slug from filenames, and resolving it would mean renumbering, which breaks every existing reference. Stability of a reference beats prettiness of a reference.

## Consequences

IDs are not sortable and carry no ordering information. The ergonomic gap is closed in the CLI rather than in the scheme: unambiguous prefix matching, fuzzy title resolution, and shell completion, so an ID rarely needs to be typed in full.
