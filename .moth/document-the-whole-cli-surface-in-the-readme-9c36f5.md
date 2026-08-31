---
id: "9c36f5"
title: Document the whole CLI surface in the README
status: done
priority: none
labels:
  - docs
created_at: 2026-08-31T15:05:53.318Z
updated_at: 2026-08-31T15:21:34.005Z
---

The README shows install, a few example commands, and the design rationale, but never lists the CLI surface. A reader cannot learn what commands exist without running `moth --help`, nor find flags without running `moth <command> --help` twelve times.

**What to build**

A reference section covering every command and its flags: `init`, `new`, `list`, `show`, `move`, `edit`, `delete`, `board`, `check`, and `schema`, marking which accept `--json`.

Scannable rather than exhaustive prose — the help text is the authority, this is the map. It must not push the rationale so far down that the README stops opening with what moth is.

Gaps this will expose, to resolve rather than paper over: `moth new` accepts neither `--priority` nor `--label`, so filing a prioritised ticket takes two commands.

**Done when**

- [x] Every command is listed with its flags
- [x] `--json` support is marked per command
- [x] `check` is the only name for it; the `doctor` alias was dropped
- [x] The `moth new` flag gap is recorded as its own ticket
