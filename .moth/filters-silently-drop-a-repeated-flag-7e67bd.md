---
id: "7e67bd"
title: Filters silently drop a repeated flag
status: done
priority: high
labels:
  - cli
created_at: 2026-10-03T16:22:02.348Z
updated_at: 2026-10-03T16:37:30.085Z
---

`moth list --status todo --status in-progress` lists only `in-progress` tickets. The first value is dropped without a word, so the output looks like a complete answer and is not. The same holds for every single-value filter: `--status`, `--category`, `--priority`, `--search`.

Asking for "everything open" is the common case on a finished project, where `moth list` is mostly done tickets. The agent that hit this piped `moth list` through `grep` and `awk` instead.

**What to build**

- `--status`, `--category` and `--priority` accept several values, repeated or comma-separated: `--status todo,in-progress`. A ticket matches if it has any of them
- A single-value flag given twice is a usage error (exit 2) naming the flag, never silently last-wins. Fix this in argument parsing, not per flag, so new flags inherit it
- `moth board` takes the same filters and gets the same behaviour

**Done when**

- [x] `--status todo --status in-progress` and `--status todo,in-progress` both list both
- [x] The same for `--category` and `--priority`
- [x] A repeated single-value flag exits 2 with a message naming it
- [x] `moth board` accepts the multi-value filters

## As built

The repeated-flag check lives in `parseArgs`, so it covers every command, not only the filters: `moth edit --title a --title b` is now refused too. It applies to string flags only; a repeated boolean such as `--json --json` is harmless and still accepted.

`--status`, `--category` and `--priority` are multi-value in the shared `FILTER_OPTIONS`, so `list` and `board` both take them. Values are not checked against config, as before: an unknown status matches nothing.
