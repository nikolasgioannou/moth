---
id: "50fc44"
title: Commit messages and formatting, enforced locally
status: done
priority: none
labels: []
created_at: 2026-08-30T23:31:00.424Z
updated_at: 2026-08-30T23:31:01.569Z
blocked_by:
  - "c41227"
---

**What to build:** A contributor writing a bad commit message or unformatted code is stopped on their own machine, before the commit exists, rather than finding out in review. Biome provides formatting and linting in one tool; lefthook runs both it and commitlint as git hooks.

- [x] A commit message that does not follow Conventional Commits is rejected before the commit is created
- [x] A conforming message commits with no friction
- [x] Formatting and linting each run over the whole codebase from a single command
- [x] Staged files are formatted and linted before a commit completes, and a failure blocks it
- [x] Hooks install as part of installing dependencies, with no separate manual step
- [x] A clean checkout passes the formatter and the linter with no changes needed
