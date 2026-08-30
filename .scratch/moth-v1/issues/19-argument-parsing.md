# 19: Argument parsing

**What to build:** A command's flags mean the same thing wherever they appear, so `moth new --json "Fix login"` and `moth new "Fix login" --json` behave identically, and a mistyped flag is reported rather than silently ignored.

**Blocked by:** 04 (moth new)

**Note:** Worth taking before the remaining command tickets. Commands currently scan `argv` positionally with `indexOf`, so every command added first reproduces the weakness and then has to be changed. `node:util`'s `parseArgs` is available in the runtime and covers flag position, `--flag=value`, boolean flags, and positionals without a dependency.

**Status:** ready-for-agent

- [ ] A flag is recognised wherever it appears relative to positional arguments
- [ ] A flag's value is accepted as both `--flag value` and `--flag=value`
- [ ] A boolean flag does not consume the argument that follows it
- [ ] An unrecognised flag exits 2 with a usage error naming the offending flag
- [ ] A positional argument beginning with a hyphen can still be passed, after `--`
- [ ] A flag given without its required value exits 2 rather than silently taking the next argument
- [ ] Every existing command keeps its behaviour, evidenced by the existing tests passing unchanged
