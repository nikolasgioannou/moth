---
id: "5ff899"
title: moth stats
status: done
priority: low
labels:
  - cli
created_at: 2026-10-03T16:22:02.468Z
updated_at: 2026-10-03T16:41:37.327Z
blocked_by:
  - "0bba83"
---

On a finished project the only way to count tickets by status was `moth list | grep | awk`.

**What to build**

- `moth stats`: ticket counts by status, in config order, on one line: `done 161 · canceled 2 · todo 0`
- Accepts the same filters as `moth list`, so `moth stats --parent <ticket>` answers "how far along is this milestone or feature"
- `--json`

**Done when**

- [x] Counts by status, in config order
- [x] Filters apply, including `--parent`
- [x] `--json` gives the same counts

## As built

Every status in config appears, at zero if need be, followed by any status a ticket uses that config no longer declares. `--json` gives `{ total, statuses }` with statuses in the same order. It shares `filterOrReport` with `list` and `board`, so an unknown `--parent` exits 1 here too.
