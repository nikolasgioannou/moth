# Contributing to moth

Everything you need is in this repository. Beyond installing [bun](https://bun.sh), you should not have to configure anything on your machine to work on moth — if you find yourself doing that, it is a bug in this document.

## Getting set up

```sh
bun install     # also installs the git hooks
bun test
```

That is the whole setup. `bun install` runs `lefthook install`, so the hooks are in place from the first command; there is no separate step to remember.

## Running moth while you work on it

```sh
bun run moth list --status todo
```

runs the CLI straight from source, so it reflects your uncommitted changes with no build step. It appears in `bun run` with no arguments, alongside the other scripts.

`bun run build` compiles `dist/moth`, which is what users will install. It only changes when you rebuild, so it is useful for checking that something which works from source also works compiled — that is exactly the gap the binary tests guard.

Putting either on your `PATH` is a personal convenience and not a setup step. An alias is one line of your own shell config.

## The commands you will use

| | |
|---|---|
| `bun test` | the whole suite |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | Biome, failing on warnings as well as errors |
| `bun run format` | Biome, writing fixes |
| `bun run build` | compile `dist/moth` |

## Where tests live, and why

```
src/                production code only
  commands/         one file per command
test/
  *.test.ts         behaviour tests, named for the behaviour they pin
  helpers/          shared fixtures and doubles
```

Tests are separated from source rather than sitting beside it, for a specific reason. moth is tested through one seam — `run(argv, io)`, the entry point that takes an argument vector and an injected environment — so a test drives several commands at once. Only three of seventeen test files touch a single command; `blocking.test.ts` touches five.

A test therefore belongs to a **behaviour**, not to a module, and is named for one: `blocking`, `filters`, `parent`, rather than `edit`, `list`, `show`. Colocating tests next to source is right when they pair one-to-one with modules; it does not fit tests that span modules by design.

Two of the tests are different in kind and say so in their names: `binary.test.ts` and `build.test.ts` exercise the build rather than moth itself.

Everything non-deterministic is injected through that seam — the clock, randomness, stdin, prompting, and whether stdout is a terminal — so tests never mock the filesystem. What moth writes to disk is the product; tests use real temporary directories and assert on the files.

## Writing a test

Prefer driving real commands over constructing files by hand. A test that sets up state through `moth new` and `moth move` keeps working when the storage format changes; one that writes frontmatter itself does not.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), enforced by commitlint. **The subject line stands alone: no body, no footer.** If a change needs explaining at length, that explanation belongs in an ADR or a ticket, where it can be found later.

```
feat: add moth board
fix: order tickets by priority then age
refactor: remove the configurable id prefix
docs: make ADR supersession legible in prose
```

Accepted types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`.

## What the hooks enforce

Installed automatically by `bun install`, and they run on your machine so you find out before pushing rather than after:

- **pre-commit** — Biome formats and lints your staged files, and re-stages what it fixed, so the formatted version is what gets committed. `tsc` typechecks. A lint error or a type error stops the commit.
- **commit-msg** — commitlint checks the message, including that there is no body or footer.

## Decisions

Before changing something structural, look in [`docs/adr/`](docs/adr/). A decision recorded there was made deliberately and usually has a rejected alternative attached; reversing one is fine, but do it knowingly, and record the reversal rather than editing the old record. [`docs/adr/README.md`](docs/adr/README.md) describes how.

The vocabulary the code and docs use is defined in [`CONTEXT.md`](CONTEXT.md). Use those words — `ticket`, `status`, `status category`, `blocker`, `slug` — and not synonyms, in code, commit messages and comments alike.

## Releasing

One command:

```sh
bun run release patch      # or minor, major, or an explicit 1.2.3
```

It refuses to proceed unless the working tree is clean, you are on `main`, `main` is up to date with origin, and the tag does not already exist. Then it lints, typechecks and tests, bumps `package.json`, commits, tags, and pushes.

Everything after the tag is CI. The release workflow re-runs the checks, verifies the tag matches `package.json`, cross-compiles a binary for each of five targets, publishes a GitHub release with the binaries and a `SHA256SUMS` file, bumps the Homebrew formula in the tap, and publishes to npm.

The two publishing steps skip rather than fail when their secrets are absent, so a release is never marked broken for want of a token:

| secret | what it unlocks |
|---|---|
| `HOMEBREW_TAP_TOKEN` | pushing the updated formula to `nikolasgioannou/homebrew-tap` |
| `NPM_TOKEN` | publishing `moth-cli` and its five platform packages |

Add `--dry-run` to run every check and stop before tagging.

Locally, `bun run build:release` and `bun run build:npm` produce the same artifacts, and `bun run formula` prints the Homebrew formula for the current version.

## The backlog

moth tracks its own work in moth:

```sh
bun run moth list --status todo --unblocked
```

shows what is specified, committed to, and not waiting on anything else.
