---
id: 27
title: A body-editing API shaped for how agents edit files
status: todo
priority: none
labels: []
created_at: 2026-08-31T01:28:25.369Z
updated_at: 2026-08-31T01:28:25.401Z
---

**What to build:** A way to change a ticket's body through moth. Today `moth edit` reaches every field except the one that holds the actual content: title, priority, labels, parent, blockers and declared custom fields all have flags, and the body has none. `moth append` only adds to the end. Changing a description means hand-editing the markdown, which was done twice while building moth and each time bypassed moth entirely.

Editing the file directly is not obviously wrong — it is markdown in your own repository — but it costs two things. `updated_at` stops being true, because moth did not make the change. And moth stops being the single writer, which is the property everything else in the design leans on.

**Blocked by:** 09 (moth edit)

**Note:** The shape is genuinely open and worth grilling before building. Four candidates, which are not mutually exclusive:

1. **Whole-body replace from stdin** — `moth edit 20 --body-file -`, mirroring `moth new`. Simplest, and symmetrical with creation. Costs an agent re-emitting the entire body correctly, which is exactly where long content drifts or gets truncated.

2. **String replacement** — `moth edit 20 --replace "old text" --with "new text"`, the shape coding agents already use for files: exact old text, exact new text, refuse when it is not unique. Token-efficient and the failure mode is loud. Needs a decision on what happens when the match is absent or ambiguous.

3. **Whole-document round-trip** — `moth show 20 --json` out, modify, `moth edit 20 --json-file -` back in, with moth validating on write. Elegantly symmetrical, needs no new flag per field ever again, and makes the schema the contract. Costs a read-modify-write race between two agents, and re-sends everything.

4. **An editor** — `moth edit 20 --editor` opening `$EDITOR`, as `git commit` does. Right for humans, useless for agents, and it would be the second command that blocks on a human after `moth init`.

The question to settle is which of these moth should have, and whether the metadata flags stay as they are or fold into one of them.

- [ ] A ticket's body can be changed through moth, without hand-editing the file
- [ ] The chosen shape is recorded with its reasoning, including what was rejected
- [ ] A body edit updates the updated timestamp, as every other mutation does
- [ ] An edit that cannot be applied unambiguously fails loudly rather than guessing
- [ ] Multi-line markdown containing quotes, backticks and code fences survives an edit unaltered
