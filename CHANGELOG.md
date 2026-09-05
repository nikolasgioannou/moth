# Changelog

Notable changes to moth, newest first.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and moth follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). While the major version is 0, a minor bump may carry breaking changes; each one is listed below with what to run.

## [Unreleased]

## [0.5.0] - 2026-09-05

### Added

- `moth upgrade` updates moth to the latest release, and `--check` reports without installing. An install owned by Homebrew or npm is never overwritten — moth prints that installer's command instead, because replacing the binary underneath a package manager leaves it convinced it still has the old version. moth contacts the network only when this command is run, and never in the background.
- `moth check` reports a parent that does not exist. Dangling blockers were already reported; a broken parent link read as a healthy store.

### Fixed

- **Parent and blocker ids were written unquoted and read back as numbers.** `parent: 66428e` parsed as `66428`, silently detaching a sub-ticket from its parent and letting the one-level nesting rule be bypassed. Ids in the `id` field were already quoted against this; the fields holding references to ids were not. Roughly 0.6% of random ids take the affected shape — digits with a trailing `e` — which is why it surfaced as an intermittent test failure rather than an obvious bug. Run `moth check` to find any store already affected.
- An ambiguous reference now lists the candidates everywhere, including `moth delete` and the `--parent` and `--blocked-by` flags. Previously only the primary argument did, so the one destructive command gave the least helpful message.
- `moth --help` described ticket ids as numbers that could be padded, which they have not been since 0.2.0.

### Changed

- Exit codes follow the spec's boundary consistently. A value that could never be legal — a priority outside the fixed set, or `--set body=` — now exits `2` rather than `1`, matching the documented meaning of a usage error. A value illegal only in this repository, such as an undefined status or an undeclared field, still exits `1`.

## [0.4.0] - 2026-09-03

### Added

- musl builds for Linux, published as release assets and as the npm packages `moth-cli-linux-x64-musl` and `moth-cli-linux-arm64-musl`. moth could not run on Alpine at all before this: a glibc binary names an ELF interpreter that does not exist there, and the loader's error names a missing file rather than the cause.

### Fixed

- npm no longer installs a glibc build on a musl system. The platform packages declare `libc`, and because that field is only honoured by npm 10.2+, pnpm and Yarn 4, the launcher also resolves the package by libc at runtime rather than trusting the install.
- `install.sh` detects musl and downloads the matching binary, and says what to install if the binary cannot start.

## [0.3.1] - 2026-09-02

### Added

- `moth new --priority <p>` and `moth new --label <l>`, so filing a prioritised or labelled ticket is one command rather than a `new` followed by an `edit`. `--label` is repeatable, and an illegal priority is refused before anything is written.

### Fixed

- The worked examples in `--help` used sequential ticket ids (`20`, `001`), which have not been moth's shape since 0.2.0.

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

- A ticket missing `created_at` — one written or edited by hand — crashed every command that lists tickets, with a `TypeError` from the sort. Ordering now falls back to the id. The crash surfaced only when the malformed ticket was read first, so it depended on the filesystem and went unseen on macOS.
- `moth check` now reports a ticket missing a required field. Previously it validated undeclared fields and unknown statuses but not missing ones, so such a ticket was neither survivable nor reported.
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

[Unreleased]: https://github.com/nikolasgioannou/moth/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/nikolasgioannou/moth/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/nikolasgioannou/moth/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/nikolasgioannou/moth/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/nikolasgioannou/moth/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/nikolasgioannou/moth/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/nikolasgioannou/moth/releases/tag/v0.1.0
