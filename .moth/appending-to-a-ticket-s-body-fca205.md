---
id: "fca205"
title: Appending to a ticket's body
status: todo
priority: medium
labels:
  - cli
created_at: 2026-10-03T16:22:02.445Z
updated_at: 2026-10-03T16:22:02.632Z
---

`ffb241` removed `moth append` and left read-modify-write as the way to change a body: `moth show --json | jq … | moth edit --body-file -`. In practice that is too heavy for the commonest edit, adding a section at the end ("As built", "Progress", "Done"). One `jq` slip wipes the body. The agent that hit this appended with a shell heredoc straight into the file instead, so `updated_at` never moved and nothing validated the result.

This reverses part of `ffb241` knowingly. Its objection was to `moth append` inventing a `## Notes` heading, which is moth having opinions about the body. Appending caller-supplied text verbatim has no such opinion, so the reasoning still holds.

**What to build**

- `moth edit <ticket> --append-body <text>` and `--append-body-file <path | ->`, adding the text after the existing body, separated by one blank line. No heading is added
- Appending bumps `updated_at`, like any edit
- `--append-body*` with `--body*` is a usage error
- `path` in `moth show --json`, for tools that edit the file directly, so they need not search `.moth/` for it

**Done when**

- [ ] Append adds text verbatim after one blank line, with no heading
- [ ] Appending to an empty body leaves no leading blank line
- [ ] `updated_at` moves on append
- [ ] Combining append with replace exits 2
- [ ] `moth show --json` includes the file path
