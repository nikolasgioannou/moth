# Changelog

Notable changes to moth, newest first.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and moth follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). While the major version is 0, a minor bump may carry breaking changes; each one is listed below with what to run.

## [Unreleased]

## [0.3.0] - 2026-08-31

Existing tickets are read correctly by this version with no migration. What changes is the command surface and the naming convention on disk.

### Removed

- **`moth append`.** The body is now replaced through `moth edit --body <text>` or `--body-file <path | ->`, mirroring `moth new`. `append` added text under a `## Notes` heading it invented, which was moth imposing structure on the one field it enforces no schema over. Adding to a body now means reading it first, which `moth show --json` returns.
- **`moth doctor`.** Use `moth check`, unchanged, `--fix` included. `doctor` conventionally means "diagnose the installation", and this command validates ticket data.

### Changed

- **Ticket files are named `slug-id.md`** — `fix-the-login-redirect-a3f8c1.md` rather than `a3f8c1-fix-the-login-redirect.md`. A leading identifier earns its position by sorting meaningfully; a random id sorts arbitrarily, so leading with one bought nothing and pushed the title rightward. Run `moth check --fix` to migrate. Ids live in frontmatter and are never parsed from filenames, so nothing that references a ticket breaks, and tickets still named the old way are read, listed and resolved normally until renamed.
- `moth check` no longer claims a filename mismatch means the title changed; it reports the mismatch and leaves the cause open.

### Added

- `moth edit --body <text>` and `moth edit --body-file <path | ->`. `--body-file -` reads stdin, so markdown pipes in without shell quoting mangling it.

### Fixed

- `--body-file` with an absolute path read the wrong location: the path was joined onto the working directory, so `/tmp/body.md` resolved to `<repo>/tmp/body.md`. Present in `moth new` since 0.1.0.
- `--body-file` with a missing path printed a stack trace; it now reports `moth: cannot read '<path>'` and exits 1.
- `--set body=` was accepted when a repository declared `body` as a custom field, writing a frontmatter key that collided with the document body. It is now refused, pointing at `--body`.

## [0.2.0] - 2026-08-30

### Changed

- Tickets are identified by six random hex characters rather than sequential numbers, so two branches can file tickets without colliding. An unambiguous prefix resolves a ticket, as does a title fragment.

### Fixed

- An empty filter result no longer reports "No tickets yet" when the store has tickets.
- A release is verified against the version being released rather than the previous one.

## [0.1.0] - 2026-08-30

First release. An issue tracker that lives in your repository: tickets are markdown files with a schema the CLI enforces, with no account and no server.

- `init`, `new`, `list`, `show`, `move`, `edit`, `delete`, `board`, `check` and `schema`
- Six fixed status categories, with repository-defined status names inside them
- Blocking relations, sub-tickets, labels, priorities and declared custom fields
- `--json` on every command that returns a ticket
- Single-binary distribution via Homebrew, npm, an install script and release archives

[Unreleased]: https://github.com/nikolasgioannou/moth/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/nikolasgioannou/moth/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/nikolasgioannou/moth/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/nikolasgioannou/moth/releases/tag/v0.1.0
