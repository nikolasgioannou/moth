# moth

An opinionated issue tracker that lives in your repo. Tickets are markdown files with an enforced schema — no account, no server, no sign-up. Built for coding agents and the people who use them.

## Agent skills

### Issue tracker

This repository tracks its own work in moth: tickets are markdown files in `.moth/`. Work them by the Moth Method, `skills/moth-method/SKILL.md`, which moth itself ships; `docs/agents/issue-tracker.md` maps the borrowed skills' vocabulary onto moth.

### Triage labels

The five canonical roles, unmodified: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
