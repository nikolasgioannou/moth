---
id: 25
title: ADR-0002 carries an argument ADR-0005 overturned
status: todo
priority: none
labels: []
created_at: 2026-08-30T23:51:46.449Z
updated_at: 2026-08-30T23:51:46.517Z
---

**What to build:** ADR-0002 rejects directory-per-status partly because "it turns every status change into a git rename, and rename/rename is the worst merge case". ADR-0005 later measured renames and found them cheap: one changed line, detected at 82% similarity, `--follow` tracking straight through.

The two are reconcilable — a rename per state transition is an order of magnitude more frequent than a rename per title edit, and ADR-0005 says so — but only ADR-0005 records the reconciliation. Someone reading ADR-0002 alone takes away a claim the project later disproved, with nothing pointing forward.

ADR-0002 also says status is "one of six queryable dimensions" and then names five: status, priority, labels, blocking, parentage.

- [ ] ADR-0002 points forward to ADR-0005 where its rename argument was revisited
- [ ] The rename argument in ADR-0002 is stated in terms of frequency, so it does not read as contradicted
- [ ] The dimension count matches the dimensions actually named
