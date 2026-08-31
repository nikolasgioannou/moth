---
id: 25
title: ADRs do not make supersession legible
status: done
priority: none
labels: []
created_at: 2026-08-30T23:51:46.449Z
updated_at: 2026-08-31T00:03:12.250Z
---

**What to build:** ADR-0002 rejects directory-per-status partly because "it turns every status change into a git rename, and rename/rename is the worst merge case". ADR-0005 later measured renames and found them cheap: one changed line, detected at 82% similarity, `--follow` tracking straight through.

The two are reconcilable — a rename per state transition is an order of magnitude more frequent than a rename per title edit, and ADR-0005 says so — but only ADR-0005 records the reconciliation. Someone reading ADR-0002 alone takes away a claim the project later disproved, with nothing pointing forward.

ADR-0002 also says status is "one of six queryable dimensions" and then names five: status, priority, labels, blocking, parentage.

- [x] ADR-0002 points forward to ADR-0005 where its rename argument was revisited
- [x] The rename argument in ADR-0002 is stated in terms of frequency, so it does not read as contradicted
- [x] The dimension count matches the dimensions actually named

## Notes

ADR-0001 has the same defect, found after this ticket was filed, and worse.

Its frontmatter says `superseded by ADR-0004`, but its whole body is present tense: "Ticket IDs **are** a configured prefix plus a random suffix", "IDs **are** not sortable". Three lines of YAML are easy to skim past, and everything below them reads as a description of how moth works today.

Its Consequences section also says the ergonomic gap is closed by "unambiguous prefix matching" — a mechanism ticket 06 deliberately removed, because for numbers it would make `1` mean "1, or 10, or 100". So the ADR advertises a feature that was considered and rejected.

Superseded ADRs should stay readable as history rather than being rewritten; the reasoning is worth keeping. What is missing is that the supersession is legible in the prose, not only in frontmatter.

Additional criteria:

- [x] A superseded ADR says so in its prose, not only its frontmatter
- [x] ADR-0001 no longer reads as a description of current behaviour
- [x] ADR-0001 does not advertise prefix matching, which was later removed
