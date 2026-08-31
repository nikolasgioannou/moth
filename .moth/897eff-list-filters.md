---
id: "897eff"
title: List filters
status: done
priority: none
labels: []
created_at: 2026-08-30T23:31:01.098Z
updated_at: 2026-08-30T23:31:01.977Z
blocked_by:
  - "eac096"
  - "c15470"
---

**What to build:** A developer narrows the backlog to the slice they care about, and an agent answers questions like "what urgent work is outstanding" in one command rather than by grepping.

- [x] Filtering by status, by category, by priority, and by label each narrow the results correctly
- [x] Multiple filters combine in one invocation and narrow cumulatively
- [x] Search matches text in both titles and bodies
- [x] A filter matching nothing exits 0 with an empty result rather than erroring
- [x] Filtering by category works without knowing this repo's status names
