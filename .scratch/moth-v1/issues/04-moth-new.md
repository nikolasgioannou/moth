# 04: moth new writes a ticket

**What to build:** An agent or a developer files a ticket with nothing but a title, and it lands on disk as a well-formed file that later commands can read.

**Blocked by:** 03 (moth init)

**Status:** ready-for-agent

- [ ] Creating a ticket with only a title succeeds and writes exactly one file
- [ ] The ID uses the configured prefix and a random suffix, and repeated creation never collides
- [ ] The filename carries both the ID and a slug derived from the title
- [ ] Frontmatter records the id, title, status, priority, and both timestamps
- [ ] A new ticket defaults to the first status in the backlog category, and to no priority
- [ ] A description is accepted from a flag or piped on stdin, and multi-line markdown containing quotes, backticks, and code fences survives unaltered
- [ ] The created ticket is printed on success, with a JSON form available
- [ ] Running new outside an initialised repo fails with a message naming init as the fix
