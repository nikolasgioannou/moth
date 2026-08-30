# 14: moth check

**What to build:** Before reporting a task complete, an agent can verify it has not left the store corrupted — and a developer can find out what drifted after a merge.

**Blocked by:** 08 (schema and custom fields), 11 (blocking relations), 12 (sub-tickets)

**Status:** ready-for-agent

- [ ] Check reports dangling blocking references
- [ ] Check reports parent-child cycles and nesting deeper than one level
- [ ] Check reports undeclared fields and states absent from config
- [ ] Check exits 0 on a clean store and non-zero when it finds problems
- [ ] The fix mode repairs what can be repaired safely and reports what it deliberately left alone
- [ ] The command is reachable under a doctor alias
