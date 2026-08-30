---
status: accepted
---

# A ticket's filename tracks its title

The slug in `NNN-slug.md` is derived from the title, and moth re-syncs it whenever moth changes the title. Frontmatter is the single source of truth; the filename is derived from it.

## Considered options

**Freezing the slug at creation** was the original decision, on the grounds that renaming pollutes git history. Measured, that argument does not hold: a retitled ticket changes one line, git detects the rename at 82% similarity, and `git log --follow` tracks straight through it. The objection had been borrowed from the directory-per-status debate (ADR-0002), where a rename happens on *every state transition* rather than on a rare title edit — an order of magnitude apart in frequency.

The failure mode decides it. A frozen slug means `001-fix-login.md` can contain "Rewrite the auth flow", so the listing *actively misinforms*. Dropping the slug entirely (`001.md`) never lies but says nothing, and filenames are read in places moth is not running: the GitHub file browser, editor tabs, grep results, `git log --stat`.

**Sequential numbering is unaffected** by this and was weighed separately: random schemes (hex, base36, Crockford base32, ULID) are all merge-safe, but none is sayable or sortable, and a sequential-plus-random hybrid was rejected because it prevents no data loss that plain sequential does not already prevent — both leave two files answering to the same number — while costing five more characters.

## Consequences

moth can only keep the filename in sync when moth performs the edit. A title changed by hand in an editor leaves the slug stale, so `moth check` reports the drift and `--fix` repairs it, matching how duplicate numbers are handled: allow the risk, detect it loudly.

Anything holding a ticket's *path* can break across a retitle. Nothing should: tickets are referenced by number, and `moth show 20` is stable by construction.
