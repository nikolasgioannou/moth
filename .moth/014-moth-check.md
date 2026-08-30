---
id: 14
title: moth check
status: done
priority: none
labels: []
created_at: 2026-08-30T23:31:01.192Z
updated_at: 2026-08-30T23:31:02.233Z
blocked_by:
  - 8
  - 11
  - 12
---

**What to build:** Before reporting a task complete, an agent can verify it has not left the store corrupted — and a developer can find out what drifted after a merge.

- [x] Check reports a filename whose slug no longer matches its title, and --fix renames it
- [x] Check reports dangling blocking references
- [x] Check reports two tickets sharing a number, and renumbering one rewrites every reference to it so none silently points at a different ticket (moved from ticket 20)
- [x] Check reports parent-child cycles and nesting deeper than one level
- [x] Check reports undeclared fields and statuses absent from config
- [x] Check exits 0 on a clean store and non-zero when it finds problems
- [x] The fix mode repairs what can be repaired safely and reports what it deliberately left alone
- [x] The command is reachable under a doctor alias
