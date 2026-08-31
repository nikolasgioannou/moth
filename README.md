# moth

[![ci](https://github.com/nikolasgioannou/moth/actions/workflows/ci.yml/badge.svg)](https://github.com/nikolasgioannou/moth/actions/workflows/ci.yml) [![npm](https://img.shields.io/npm/v/moth-cli)](https://www.npmjs.com/package/moth-cli) [![license](https://img.shields.io/github/license/nikolasgioannou/moth)](LICENSE)

An issue tracker that lives in your repository. Tickets are markdown files with a schema the CLI enforces — no account, no server, no sign-up.

```
$ moth list
backlog
  002  Ship the binary        high
  001  Parse the frontmatter  none
```

## Install

```sh
brew install nikolasgioannou/tap/moth
```

```sh
curl -fsSL https://raw.githubusercontent.com/nikolasgioannou/moth/main/install.sh | sh
```

```sh
npm install -g moth-cli
```

Or grab a binary from [releases](https://github.com/nikolasgioannou/moth/releases). macOS, Linux and Windows.

## Use it

```sh
moth init                                   # one question per status, Enter accepts each
moth new "Parse the frontmatter"
moth new "Ship the binary" --body "Needs the parser first."
moth edit 2 --blocked-by 1 --priority high --label release
```

Then ask what you can actually start, rather than what merely exists:

```
$ moth list --unblocked
backlog
  001  Parse the frontmatter  none
```

Ticket 2 is missing because it is waiting on ticket 1.

Name a ticket however you remember it. `moth show 2`, `moth show 002` and `moth show "ship the binary"` all find the same one, and an ambiguous reference lists the candidates rather than guessing.

`moth --help` lists every command; each one's `--help` carries a worked example. `moth schema --json` reports exactly what this repository considers a legal ticket, which is how an agent learns the rules in one call.

## Why it exists

A folder of markdown files is free, but nothing enforces it. Session one's agent writes `status: todo`. Session three's agent, having never seen that file, writes `state: in_progress`. By session ten the folder is unqueryable, and "what's blocked?" means re-deriving a grep every time.

moth refuses writes a bare filesystem would accept: an unrecognised status, a field nobody declared, a parent that would form a cycle. An agent cannot invent `status: blocked`, because the write fails and says what is legal. Because the shape is known, querying it is a command rather than a grep somebody has to get right.

## What it refuses to do

The refusals are the design, not gaps:

- **No assignees, no accounts.** Moving a ticket into a started status is how you claim it.
- **No statuses outside six fixed categories.** Name your own; each belongs to `backlog`, `unstarted`, `started`, `completed`, `canceled` or `duplicate`. Queries by category work in any repository.
- **No undeclared fields.** Custom fields are allowed, but must be declared in config first, so an agent can never introduce one.
- **No comments, no activity log.** `git log -p` on a ticket is already a complete, attributed history.
- **No cycles, sprints, estimates, projects or manual ordering. No web UI, no TUI.**

Every rejection, with its reasoning, is in [the spec](docs/spec-v1.md#out-of-scope).

## Storage

`moth.config.yml` at the root, and one markdown file per ticket in `.moth/`:

```markdown
---
id: 3
title: Ship the first binary
status: backlog
priority: high
labels:
  - release
created_at: 2026-08-31T02:31:59.759Z
updated_at: 2026-08-31T02:31:59.787Z
blocked_by:
  - 1
---

Blocked on the parser landing.
```

Flat, with nothing central that every write touches, so two branches creating tickets merge cleanly. Commit them with your code and they travel through branches, clones and pull requests.

## Design

- [The v1 spec](docs/spec-v1.md) — what was built, and every rejected alternative
- [Architecture decisions](docs/adr/) — including two reversals, with the reasoning that changed
- [Contributing](CONTRIBUTING.md)

moth tracks its own development in moth: the backlog is [`.moth/`](.moth/).

## Licence

[MIT](LICENSE)
