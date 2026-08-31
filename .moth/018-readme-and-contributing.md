---
id: 18
title: README and CONTRIBUTING
status: todo
priority: none
labels: []
created_at: 2026-08-30T23:31:01.383Z
updated_at: 2026-08-31T00:28:13.628Z
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

Local development, worth documenting in CONTRIBUTING. Running moth from source
must need nothing outside the repository, the same way contributors are not
asked to configure a global gitignore:

    bun run moth list --status todo

runs the CLI straight from source, reflecting uncommitted changes with no build
step, and shows up in `bun run` so it is discoverable.

Putting it on PATH is a personal convenience, not a setup step, and CONTRIBUTING
should not ask for it: an alias is one line of somebody's own shell config. `dist/moth` is the compiled binary and needs
`bun run build` first; it is what users will install once distribution exists.

- [ ] CONTRIBUTING explains how to run moth from source while developing
- [ ] Nothing in CONTRIBUTING asks a contributor to configure anything outside the repository, beyond installing bun

Repository layout, to be stated in CONTRIBUTING so nobody has to re-derive it:

    src/                production code only
      commands/         one file per command
    test/
      *.test.ts         behaviour tests, named for the behaviour they pin
      helpers/          shared fixtures and doubles

Tests are separated from source rather than colocated, and the reason is
specific: moth is tested at the `run(argv, io)` seam, so a test drives several
commands at once. Only 2 of 17 test files touch a single command; `blocking`
touches five. A test therefore belongs to a behaviour, not to a module, and is
named accordingly: `blocking`, `filters`, `parent`, not `edit`, `list`, `show`.

Colocation is right when tests pair 1:1 with modules, which is how hono is laid
out. Projects whose tests span modules separate them and give helpers their own
directory, which is how execa and prettier are laid out. moth is the second kind.

- [ ] CONTRIBUTING states where tests live and why, so the convention is not inferred
