# 06: ID resolution and moth show

**What to build:** A developer refers to a ticket the way they actually remember it — a fragment of the ID, or a few words from the title — and moth resolves it or tells them it was ambiguous.

**Blocked by:** 04 (moth new)

**Status:** ready-for-agent

- [ ] A ticket is displayable by its full ID
- [ ] A ticket is displayable by any unambiguous prefix of its ID
- [ ] A ticket is displayable by a fuzzy match against its title
- [ ] A reference matching more than one ticket exits non-zero and lists the candidates instead of guessing
- [ ] A reference matching nothing exits non-zero with a message that distinguishes it from an ambiguous match
- [ ] Show renders the metadata and the body, with a JSON form available
