# 02: Commit messages and formatting, enforced locally

**What to build:** A contributor writing a bad commit message or unformatted code is stopped on their own machine, before the commit exists, rather than finding out in review. Biome provides formatting and linting in one tool; lefthook runs both it and commitlint as git hooks.

**Blocked by:** 01 (project scaffold)

**Status:** ready-for-agent

- [x] A commit message that does not follow Conventional Commits is rejected before the commit is created
- [x] A conforming message commits with no friction
- [x] Formatting and linting each run over the whole codebase from a single command
- [x] Staged files are formatted and linted before a commit completes, and a failure blocks it
- [x] Hooks install as part of installing dependencies, with no separate manual step
- [x] A clean checkout passes the formatter and the linter with no changes needed
