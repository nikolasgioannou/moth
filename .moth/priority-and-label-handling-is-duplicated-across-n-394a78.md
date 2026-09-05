---
id: "394a78"
title: Priority and label handling is duplicated across new and edit
status: done
priority: medium
labels:
  - cli
created_at: 2026-09-05T04:00:28.446Z
updated_at: 2026-09-05T04:07:26.104Z
---

Found by a code review of the changes since v0.3.0.

`moth new` and `moth edit` each validate `--priority` with the same five lines:

```ts
const priority = typeof values.priority === "string" ? values.priority : "none";
if (!(PRIORITIES as readonly string[]).includes(priority)) {
  io.stderr(`moth: '${priority}' is not a priority. Legal values: ${PRIORITIES.join(", ")}\n`);
  return 1;
}
```

The label handling is duplicated too: `[...new Set(stringList(values.label))].sort()` in `new`, and the add/remove/sort merge in `edit`.

`src/command.ts` now exists as the home for what every command shares, so this has somewhere to go that it did not have when the second copy was written.

**Done when**

- [x] Priority validation lives in one place, used by both commands
- [x] The label merge lives in one place
- [x] The error message is identical from both commands, because it comes from one string
