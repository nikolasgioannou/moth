---
id: "3dba25"
title: moth new cannot set blockers
status: done
priority: medium
labels:
  - cli
created_at: 2026-10-03T16:22:02.372Z
updated_at: 2026-10-03T16:37:49.920Z
---

Filing work found mid-plan takes two commands: `moth new`, then `moth edit <id> --blocked-by <ticket>`. `moth new` already takes `--priority`, `--label` and `--parent`; blockers are the odd one out.

**What to build**

- `moth new "<title>" --blocked-by <ticket>`, repeatable, resolving tickets exactly as `moth edit --blocked-by` does
- An unknown or ambiguous blocker refuses the whole command and writes nothing

**Done when**

- [x] `moth new` accepts `--blocked-by`, once or several times
- [x] An unresolvable blocker exits 1 and no ticket file is created
- [x] `moth new --help` shows it

## As built

Blockers are resolved before the id is allocated or anything is written, so an unknown or ambiguous one exits 1 with no file created. Duplicates collapse and the list is sorted, matching what `moth edit --blocked-by` stores.
