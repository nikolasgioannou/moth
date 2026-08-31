---
status: accepted
---

# Sequential ticket numbers, superseding ADR-0001

Tickets are numbered sequentially and stored as `NNN-slug.md`, zero-padded to three digits. ADR-0001 chose a random suffix instead; this reverses that.

## Why the earlier reasoning no longer holds

ADR-0001's decisive argument was that a collision would be *silent*: two branches each allocate the same number, their slugs differ, so the filenames differ, and git merges both without reporting a conflict. That remains true.

What changed is that moth can now detect it. Reading the store reports numbers held by more than one ticket, so the failure is loud at the next command rather than never. A detected collision is an ordinary problem; a silent one is a corruption. The trade that looked unacceptable is acceptable once the detection exists.

Against that, lived use showed the ergonomic gap was larger than estimated. A directory of `001-project-scaffold.md`, `002-commit-and-format-checks.md` is legible at a glance and sorts into dependency order; a directory of `MOTH-7f3a-…` is neither.

## Consequences

Padding to three digits matters: with two, `100` sorts before `99` and a directory listing goes wrong exactly when the backlog grows.

The remaining hazard is renumbering. Resolving a duplicate by renumbering must rewrite every reference to it, or a reference silently points at a different ticket — worse than a dangling one, because it resolves. That obligation belongs with the command that does the renumbering.

The id in frontmatter is the number itself. YAML parses an unquoted `020` as `20`, so storing it padded would lose the padding on the first round-trip. Padding is presentation, applied to filenames and output. (A configurable prefix was presentation too, and was later removed; see the spec's Out of Scope.)
