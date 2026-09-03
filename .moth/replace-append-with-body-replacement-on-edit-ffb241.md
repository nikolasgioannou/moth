---
id: "ffb241"
title: Replace append with body replacement on edit
status: done
priority: high
labels:
  - cli
created_at: 2026-08-31T15:05:53.248Z
updated_at: 2026-09-03T01:06:55.357Z
---

moth reaches every field except the one holding the content. `moth edit` has flags for title, priority, labels, parent, blockers and declared custom fields; the body has none. `moth append` can only add to the end, and it does so under a `## Notes` heading it invents — moth having an opinion about how your markdown is organised, which it should not have.

Replace both with a single symmetric operation.

**What to build**

- `moth edit <ticket> --body <text>` and `--body-file <path | ->`, mirroring `moth new`. Full replacement of the body.
- Remove `moth append` entirely: the command, its help entry, its tests, and its mentions in the spec.
- Reserve `body` as a field name so `--set body=` cannot create a frontmatter key that collides with the document body.

**Why replacement rather than append**

The body is opaque to moth. It has no schema, so moth enforces nothing about it and should impose no structure on it either. A caller that wants a notes section writes one; moth does not supply the heading. Read-modify-write is the cost, and `moth show <ticket> --json` already returns the body to read.

**Done when**

- [x] `moth edit <t> --body-file -` replaces the body from stdin
- [x] `moth edit <t> --body <text>` replaces it from an argument
- [x] `moth edit <t> --body-file <path>` replaces it from a file
- [x] Replacing the body updates `updated_at`
- [x] `moth append` no longer exists, and its help entry is gone
- [x] `--set body=` is refused even when `body` is declared in config
- [x] The spec no longer describes a notes heading
