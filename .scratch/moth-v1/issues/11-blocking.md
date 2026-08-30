# 11: Blocking relations

**What to build:** A ticket records what must finish before it can start, and a developer can ask what is actually startable right now.

**Blocked by:** 09 (moth edit), 10 (list filters)

**Status:** ready-for-agent

- [x] A ticket records the tickets that block it
- [x] Viewing a blocking ticket shows what it blocks, derived at read time rather than stored
- [x] Only the forward direction is ever written to disk
- [x] A reference to a ticket that does not exist produces a warning and does not fail the command
- [x] Blocked and unblocked filters work, where blocked means at least one blocker is not in a terminal category (completed, canceled, duplicate)
