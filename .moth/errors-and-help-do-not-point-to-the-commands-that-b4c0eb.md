---
id: "b4c0eb"
title: Errors and help do not point to the commands that fix the problem
status: done
priority: high
labels:
  - cli
created_at: 2026-10-03T16:22:02.321Z
updated_at: 2026-10-03T16:41:05.242Z
---

An agent tracking a 163-ticket project with moth asked for `moth check --fix` and `moth list --unblocked` as new features. Both already existed. It learned the commands it needed first and never read further, so the help it did not read could not help it.

The two places it was actually looking said nothing. `moth check` reports a stale filename as `x.md should be named y.md`, which names the problem but not the fix. It then fixed the file by hand and remembered to use `moth edit --title` from then on.

It also kept a hand-written plan to decide which ready ticket came first, not knowing `moth list` already orders each status by priority, then age. The first row of `moth list --status todo --unblocked` is the next ticket to take.

**What to build**

- The stale-filename finding names its fix: `moth check --fix`, or `moth edit <id> --title` for next time
- Every other `moth check` finding that `--fix` repairs says so too
- `moth list --help` shows `--status todo --unblocked` in its worked example as the way to find the next ticket, and says how tickets are ordered within a status

**Done when**

- [x] A stale filename's message names `moth check --fix`
- [x] Every finding `--fix` can repair says so in its message
- [x] `moth list --help` has an `--unblocked` example and states the order: priority, then age

## As built

The two findings `--fix` repairs, a stale filename and a duplicate id, now name it; the stale filename also names `moth edit <id> --title` as the way not to cause it again. A dangling blocker's finding already names `moth edit --unblock` (from `e74b8a`), since `--fix` deliberately leaves it.

`moth list --help` leads with `--status todo --unblocked` and says tickets are ordered by priority, then age, within each status.
