# 10: List filters

**What to build:** A developer narrows the backlog to the slice they care about, and an agent answers questions like "what urgent work is outstanding" in one command rather than by grepping.

**Blocked by:** 05 (moth list), 09 (moth edit)

**Status:** ready-for-agent

- [x] Filtering by status, by category, by priority, and by label each narrow the results correctly
- [x] Multiple filters combine in one invocation and narrow cumulatively
- [x] Search matches text in both titles and bodies
- [x] A filter matching nothing exits 0 with an empty result rather than erroring
- [x] Filtering by category works without knowing this repo's status names
