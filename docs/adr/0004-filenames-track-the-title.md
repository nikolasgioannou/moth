---
status: accepted
---

# A ticket's filename tracks its title

A ticket is stored as `slug-id.md` — `fix-the-login-redirect-a3f8c1.md`. The slug is derived from the title, and moth re-syncs it whenever moth changes the title. Frontmatter is the single source of truth; the filename is derived from it.

## Considered options

**Freezing the slug at creation** was the original decision, on the grounds that renaming pollutes git history. Measured, that argument does not hold: a retitled ticket changes one line, git detects the rename at 82% similarity, and `git log --follow` tracks straight through it. The objection had been borrowed from the directory-per-status debate ([ADR-0001](0001-flat-ticket-directory.md)), where a rename happens on *every state transition* rather than on a rare title edit — an order of magnitude apart in frequency.

The failure mode decides it. A frozen slug means a file named `fix-login` can contain "Rewrite the auth flow", so the listing *actively misinforms*. Dropping the slug entirely never lies but says nothing, and filenames are read in places moth is not running: the GitHub file browser, editor tabs, grep results, `git log --stat`.

**Leading with the id** — `a3f8c1-fix-the-login-redirect.md` — follows the convention of ADRs (`0004-slug.md`), Jekyll posts and Rails migrations, and was the original layout. That convention exists because a leading identifier *sorts meaningfully*: by decision order, by date, by sequence. moth's ids are random ([ADR-0003](0003-random-hex-ticket-ids.md)), so leading with one pays the convention's cost, pushing the title rightward into a ragged column, and collects none of its benefit. Slug-first sorts by title, which groups related tickets, and puts the readable part where it is read: `git status`, `git diff --stat`, and the file list on a pull request.

The cost accepted: ids no longer form an aligned column in a directory listing, and a truncated filename loses the id rather than the tail of the title. Neither bites, because `moth list` already prints an aligned id column, and a ticket resolves by title as well as by id.

## Consequences

moth can only keep the filename in sync when moth performs the edit. A title changed by hand in an editor leaves the slug stale, so `moth check` reports the drift and `--fix` repairs it, matching how duplicate ids are handled: allow the risk, detect it loudly.

That repair path also makes the layout cheap to change. The filename is built in one function; changing it makes every existing ticket disagree, and `moth check --fix` renames all of them with no migration code written for the purpose.

Anything holding a ticket's *path* can break across a retitle. Nothing should: tickets are referenced by id, and `moth show a3f8c1` is stable by construction.
