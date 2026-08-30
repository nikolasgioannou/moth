# 05: moth list default view

**What to build:** A developer sees their whole backlog at a glance, grouped and aligned, and an agent gets the same data as JSON. This is the point at which moth becomes minimally useful.

**Blocked by:** 04 (moth new)

**Status:** ready-for-agent

- [ ] Listing shows every ticket, grouped by status
- [ ] Columns stay aligned regardless of title length
- [ ] The JSON form emits machine-readable output with no colour or decoration
- [ ] Colour and decoration are suppressed automatically when output is not a terminal, with no flag required
- [ ] Listing an empty store prints a message and exits 0 rather than printing nothing
- [ ] Ticket data goes to stdout; any diagnostics go to stderr
