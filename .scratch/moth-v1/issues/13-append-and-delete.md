# 13: moth append and moth delete

**What to build:** An agent records findings on a ticket mid-task without rewriting the file, and a genuine mistake can be removed rather than living in the backlog forever.

**Blocked by:** 07 (statuses and move)

**Status:** ready-for-agent

- [ ] Text piped to append is added under a notes heading, leaving the rest of the file untouched
- [ ] Appending twice accumulates rather than replaces
- [ ] Multi-line markdown survives an append unaltered
- [ ] Delete removes the ticket's file
- [ ] Delete requires an explicit confirmation flag, so an agent cannot delete by accident, and does not prompt
- [ ] Delete's help text points at cancelling as the normal path
