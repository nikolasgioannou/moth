---
id: "504470"
title: Argument parsing
status: done
priority: none
labels: []
created_at: 2026-08-30T23:31:01.406Z
updated_at: 2026-08-30T23:31:02.520Z
blocked_by:
  - "d9bfc0"
---

**What to build:** A command's flags mean the same thing wherever they appear, so `moth new --json "Fix login"` and `moth new "Fix login" --json` behave identically, and a mistyped flag is reported rather than silently ignored.

**Note:** Worth taking before the remaining command tickets. Commands currently scan `argv` positionally with `indexOf`, so every command added first reproduces the weakness and then has to be changed. `node:util`'s `parseArgs` is available in the runtime and covers flag position, `--flag=value`, boolean flags, and positionals without a dependency.

- [x] A flag is recognised wherever it appears relative to positional arguments
- [x] A flag's value is accepted as both `--flag value` and `--flag=value`
- [x] A boolean flag does not consume the argument that follows it
- [x] An unrecognised flag exits 2 with a usage error naming the offending flag
- [x] A positional argument beginning with a hyphen can still be passed, after `--`
- [x] A flag given without its required value exits 2 rather than silently taking the next argument
- [x] Every existing command keeps its behaviour, evidenced by the existing tests passing unchanged
