---
id: "3dba25"
title: moth new cannot set blockers
status: todo
priority: medium
labels:
  - cli
created_at: 2026-10-03T16:22:02.372Z
updated_at: 2026-10-03T16:22:02.560Z
---

Filing work found mid-plan takes two commands: `moth new`, then `moth edit <id> --blocked-by <ticket>`. `moth new` already takes `--priority`, `--label` and `--parent`; blockers are the odd one out.

**What to build**

- `moth new "<title>" --blocked-by <ticket>`, repeatable, resolving tickets exactly as `moth edit --blocked-by` does
- An unknown or ambiguous blocker refuses the whole command and writes nothing

**Done when**

- [ ] `moth new` accepts `--blocked-by`, once or several times
- [ ] An unresolvable blocker exits 1 and no ticket file is created
- [ ] `moth new --help` shows it
