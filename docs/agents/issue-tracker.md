# Issue tracker: moth

This repository tracks its own work in moth. Tickets are markdown files in `.moth/`, one per ticket, and `moth.config.yml` at the root declares the statuses and any custom fields.

## Conventions

- A ticket is referred to by its number: `20`, `020`, or a few words from its title
- Statuses are `backlog`, `todo`, `in-progress`, `done`, `canceled`, `duplicate`
- Work that is specified and ready sits in `todo`; `backlog` is for anything not yet committed to
- Dependencies are recorded with `moth edit <ticket> --blocked-by <ticket>`, never as prose

## When a skill says "publish to the issue tracker"

    moth new "A title" --body-file -

with the body piped in on stdin, then set anything else with `moth edit`.

## When a skill says "fetch the relevant ticket"

    moth show <ticket>

Add `--json` to either for machine-readable output. `moth schema --json` reports every legal field, status and priority without reading config by hand.

## Finding work

    moth list --status todo --unblocked

lists what is specified, committed to, and not waiting on anything else. Run `moth check` before reporting a task complete.

## The spec

The v1 spec lives at `docs/spec-v1.md`.
