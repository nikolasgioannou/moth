---
id: "5ff899"
title: moth stats
status: todo
priority: low
labels:
  - cli
created_at: 2026-10-03T16:22:02.468Z
updated_at: 2026-10-03T16:32:30.904Z
blocked_by:
  - "0bba83"
---

On a finished project the only way to count tickets by status was `moth list | grep | awk`.

**What to build**

- `moth stats`: ticket counts by status, in config order, on one line: `done 161 · canceled 2 · todo 0`
- Accepts the same filters as `moth list`, so `moth stats --parent <ticket>` answers "how far along is this milestone or feature"
- `--json`

**Done when**

- [ ] Counts by status, in config order
- [ ] Filters apply, including `--parent`
- [ ] `--json` gives the same counts
