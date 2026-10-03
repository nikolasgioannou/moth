---
id: "f29148"
title: The Moth Method
status: todo
priority: medium
labels:
  - docs
created_at: 2026-10-03T16:32:30.797Z
updated_at: 2026-10-03T16:32:30.931Z
blocked_by:
  - "0bba83"
  - "b4c0eb"
---

moth enforces a schema, but how to work with it is left to each project to invent. Winston, a 163-ticket build worked through by an agent and its founder, invented a working method of its own: claim a ticket before starting, re-check it against the current docs, one ticket per commit, move it to done in the same commit as the work, record what was built in the body, run `moth check` before committing. Most of that was good, and every project should not have to rediscover it. Some of it was workarounds for things moth already did and the agent did not know about.

moth's own repository borrows a third-party skill set and maps it onto moth through `docs/agents/`.

Linear publishes the Linear Method: an opinionated account of how to build product with the tool. moth should have the same, written for coding agents as much as for people, and shipped as an agent skill so an agent loads it before touching tickets.

**What it covers**

- Writing a ticket: the problem, what to build, done-when criteria an agent can verify
- Structuring work: parents for milestones and features, blockers for real dependencies only, priority for what jumps the queue. No separate plan file; moth is the plan
- Finding work: `moth list --status todo --unblocked`, and why its first row is the next ticket
- Working a ticket: claim it, re-read it, one ticket per commit, close it in the same commit, append what was built
- Keeping the store honest: `moth check` in a pre-commit hook and in CI, `--fix` for drift, never hand-edit a title
- Triage: what backlog, todo and canceled mean, and when to delete instead of cancel

**Decide first**

How it ships. Options: a file `moth init` offers to write into the repo; a command that prints it (`moth method`), so it always matches the installed version; or a published skill or plugin installed separately. Printing from the binary keeps the method and the CLI in step, which matters because the method names commands and flags.

**Done when**

- [ ] The method is written, covering every heading above
- [ ] It ships in the chosen form, and a fresh agent in a fresh repo can load it
- [ ] Every command and flag it names exists, checked by a test so the method cannot drift from the CLI
- [ ] moth's own repo uses it in place of the borrowed skill mapping where they overlap
