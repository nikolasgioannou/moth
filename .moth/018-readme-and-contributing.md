---
id: 18
title: README and CONTRIBUTING
status: todo
priority: none
labels: []
created_at: 2026-08-30T23:31:01.383Z
updated_at: 2026-08-30T23:55:49.155Z
blocked_by:
  - 16
  - 17
---

**What to build:** Someone arriving at the repository can work out what moth is, install it, and make a correct first contribution without having to ask anyone.

- [ ] The README states what moth is, and what it deliberately does not do
- [ ] The README documents installation for every supported route
- [ ] The README carries a worked example taking a reader from an empty repo to a filtered list of tickets
- [ ] CONTRIBUTING documents the commit convention, including that the subject line stands alone
- [ ] CONTRIBUTING documents how to install dependencies, run the tests, and run the formatter and linter
- [ ] CONTRIBUTING explains that the hooks install themselves and states what they enforce
- [ ] CONTRIBUTING sits where GitHub surfaces it when a pull request is opened

## Notes

Local development setup, worth documenting in CONTRIBUTING:

`bin/moth-dev` runs the CLI straight from source, so it reflects uncommitted changes with no build step. Symlink it onto PATH once:

    ln -s "$PWD/bin/moth-dev" ~/.local/bin/moth-dev

`moth` itself is the compiled binary at `dist/moth`, which needs `bun run build` first and only changes when you rebuild. Having both means you can compare source behaviour against the last build.

- [ ] CONTRIBUTING explains how to run moth from source while developing
