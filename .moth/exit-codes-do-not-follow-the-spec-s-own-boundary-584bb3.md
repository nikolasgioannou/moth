---
id: "584bb3"
title: Exit codes do not follow the spec's own boundary
status: done
priority: medium
labels:
  - cli
created_at: 2026-09-05T04:00:28.495Z
updated_at: 2026-09-05T04:07:26.374Z
---

Found by a code review of the changes since v0.3.0.

The spec fixes three exit codes: `0` succeeded, `1` ran but could not do what was asked, `2` usage error, the arguments were wrong. The CLI does not apply the boundary consistently.

- `moth edit <t> --title ""` returns `2`
- `moth edit <t> --priority critical` returns `1`
- `moth edit <t> --set body=x` returns `1`
- `moth move <t> nonexistent` returns `1`

**The distinction that makes this decidable:** whether the value could ever have been legal.

`critical` is not a priority in any repository, and `body` is not a settable field in any repository. Those are wrong arguments, knowable without reading a config, so they are `2`. A status not in this config, or a custom field this repo has not declared, could be legal elsewhere — the command ran, understood the request, and could not do it. Those stay `1`.

**What to build**

Apply that rule: `--priority` with a value outside the fixed set, and `--set body=`, both become `2`. Status and undeclared-field errors stay `1`.

**Note this is a behaviour change.** Two tests assert `1` for an illegal priority. Anything checking exit codes to distinguish a typo from a legitimate failure gets a better answer, but a script matching on `1` sees a change.

**Done when**

- [x] A value that could never be legal exits `2`
- [x] A value that is illegal only in this repository exits `1`
- [x] The rule is stated in the spec beside the exit codes, so the next case is decidable without re-deriving it
- [x] Tests cover both sides of the boundary
