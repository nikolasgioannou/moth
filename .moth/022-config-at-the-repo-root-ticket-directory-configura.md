---
id: 22
title: Config at the repo root, ticket directory configurable
status: done
priority: none
labels: []
created_at: 2026-08-30T23:31:01.474Z
updated_at: 2026-08-30T23:31:02.696Z
blocked_by:
  - 3
  - 5
---

**What to build:** The config lives at `moth.config.yml` in the repo root, where a person expects to find a tool's configuration, and it names the directory tickets live in, so a repo can use `tickets/`, `.tickets/`, or anything else instead of `.moth/`.

**Note:** The two halves depend on each other. Once the ticket directory is configurable, moth can no longer find its config by looking inside a fixed directory, so the config has to sit somewhere known — which is the argument for the repo root.

- [x] Config is read from `moth.config.yml` at the repo root
- [x] The config names the directory tickets live in, defaulting to a sensible choice
- [x] Init creates the ticket directory wherever the config points
- [x] Every command finds the ticket directory through the config rather than a hardcoded path
- [x] Running a command from a subdirectory still finds the repo root
- [x] A config naming a directory that does not exist fails with a message saying which directory is missing
