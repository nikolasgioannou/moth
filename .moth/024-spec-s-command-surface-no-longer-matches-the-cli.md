---
id: 24
title: Spec's command surface no longer matches the CLI
status: todo
priority: none
labels: []
created_at: 2026-08-30T23:51:46.421Z
updated_at: 2026-08-30T23:51:46.495Z
---

**What to build:** The spec describes a command surface moth does not have, so a reader following it writes commands that fail.

Two specific drifts, found by auditing the spec against the binary:

- The spec says commands are "noun-verb (`moth ticket create`), with top-level aliases". Only the aliases exist: `moth ticket create` exits 2 with "unknown command 'ticket'". Either build the noun-verb layer or amend the spec to describe the flat surface that was actually built. Worth deciding rather than defaulting: the original argument was that matching `gh` helps agents guess correctly first time.
- The spec says `--json` is on "every read command". `moth board` has no `--json`, deliberately, because it emits markdown. Either narrow the claim or add the flag.

- [ ] The spec's command surface section matches what the binary accepts
- [ ] A decision on noun-verb is recorded, either as built or as explicitly out of scope
- [ ] The `--json` claim is either true of every read command or narrowed to name the exception
