# 16: Help text audit

**What to build:** An agent that has never seen moth before can learn to use it correctly from help output alone. No skill ships with moth, so this is the whole of its usage guidance and a release requirement rather than polish.

**Blocked by:** 13 (append and delete), 14 (moth check), 15 (moth board)

**Status:** ready-for-agent

- [ ] Every command's help contains at least one worked example with realistic values
- [ ] Help documents what each exit code means
- [ ] Top-level help lists every command with a one-line description
- [ ] Help is reachable from the top level and from every subcommand
- [ ] Given only the help output, an agent can initialise a repo, create a ticket, find it again, and move it, without any other documentation
