# moth

An opinionated issue tracker that lives in your repository. Tickets are markdown files with an enforced schema — no account, no server, no sign-up.

Built for coding agents and the people who use them.

```
$ moth list
backlog
  003  Ship the first binary  high
  002  Handle quoted strings  none  ↳ 001

in-progress
  001  Parse the frontmatter  none
```

## Why it exists

A folder of markdown files is free, but it is a convention rather than a tool, and nothing enforces it. Session one's agent writes `status: todo`. Session three's agent, having never seen that file, writes `state: in_progress`. By session ten the folder is unqueryable, and answering "what's blocked?" means re-deriving a grep every time.

moth's value is the constraint. It refuses writes a bare filesystem would accept: an unrecognised status, a field nobody declared, a parent that would create a cycle. An agent cannot invent `status: blocked` on a whim, because the write fails and tells it what is legal. And it can ask: `moth schema --json` returns every legal field and value for the repository, so a session with no memory of previous sessions can discover the rules in one call.

Because the shape of the data is known, querying it is a command rather than a grep somebody has to get right.

## What it deliberately does not do

The refusals are the design, not gaps waiting to be filled:

- **No assignees, and no accounts.** Moving a ticket into a started status is how you claim it.
- **No custom statuses outside six fixed categories.** You name your own statuses; every one belongs to `backlog`, `unstarted`, `started`, `completed`, `canceled`, or `duplicate`. Queries against categories work in any repository; queries against your status names work in yours.
- **No undeclared fields.** Custom fields are allowed, but they must be declared in config first, so an agent can never introduce one.
- **No comments and no activity log.** `git log -p` on a ticket file is already a complete, attributed, tamper-evident history. Notes append to the body.
- **No cycles, sprints, estimates, projects, or manual ordering.**
- **No web UI, and no TUI.** The CLI is the interface.

The full list, each with its reasoning, is in [the spec](docs/spec-v1.md#out-of-scope).

## Installing

**moth is not published yet.** Homebrew, a `curl` installer and an npm package are tracked in [ticket 017](.moth/017-distribution.md). Until then, build it:

```sh
git clone https://github.com/nikolasgioannou/moth.git
cd moth
bun install
bun run build      # produces ./dist/moth
```

Put `dist/moth` somewhere on your `PATH`, or run it by path.

## A worked example

Starting from a repository with no tickets:

```sh
$ moth init
Statuses in 'backlog' [backlog]
Statuses in 'unstarted' [todo]
Statuses in 'started' [in-progress]
Statuses in 'completed' [done]
Statuses in 'canceled' [canceled]
Statuses in 'duplicate' [duplicate]
```

One question per status category, and Enter accepts each default. That writes `moth.config.yml` at the root and creates `.moth/` for the tickets. Then file some work:

```sh
$ moth new "Parse the frontmatter"
001  Parse the frontmatter

$ moth new "Handle quoted strings" --parent 1
002  Handle quoted strings

$ moth new "Ship the first binary" --body "Blocked on the parser landing."
003  Ship the first binary
```

Relate and prioritise it:

```sh
$ moth edit 3 --blocked-by 1 --priority high --label release
003  Ship the first binary

$ moth move 1 in-progress
001  Parse the frontmatter  in-progress
```

Then ask what is actually startable — work that has been committed to and is not waiting on anything:

```sh
$ moth list --unblocked --category backlog
backlog
  002  Handle quoted strings  none  ↳ 001
```

And look at one ticket:

```sh
$ moth show 3
003  Ship the first binary
status    backlog
priority  high
labels    release
blocked by 001
created   2026-08-31T00:35:11.462Z
updated   2026-08-31T00:35:11.484Z

Blocked on the parser landing.
```

A ticket is referred to by its number, padded or not, or by words from its title: `moth show 3`, `moth show 003`, and `moth show "quoted strings"` all work. An ambiguous reference lists the candidates rather than guessing.

## How it is stored

```
moth.config.yml          statuses, custom fields, where tickets live
.moth/
  001-parse-the-frontmatter.md
  002-handle-quoted-strings.md
```

One markdown file per ticket, flat, with YAML frontmatter for structured fields and the body for the description. Nothing central that every write touches, so two branches creating tickets merge without conflict. Commit them with your code and they travel through branches, clones and pull requests.

```markdown
---
id: 3
title: Ship the first binary
status: backlog
priority: high
labels:
  - release
created_at: 2026-08-31T00:35:11.462Z
updated_at: 2026-08-31T00:35:11.484Z
blocked_by:
  - 1
---

Blocked on the parser landing.
```

## Commands

Run `moth --help` for the list, and `moth <command> --help` for a worked example of any one of them. `moth schema --json` reports what this repository considers a legal ticket.

## Design notes

- [The v1 spec](docs/spec-v1.md) — what was built, and every rejected alternative
- [Architecture decisions](docs/adr/) — including two reversals, with the reasoning that changed

moth tracks its own development in moth: the backlog is in [`.moth/`](.moth/).

## Licence

[MIT](LICENSE)
