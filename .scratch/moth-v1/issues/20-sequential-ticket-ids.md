# 20: Sequential ticket ids

**What to build:** A ticket is identified by a number, and its file is named `NNN-slug.md`, so a directory listing reads in order and a person can say "ticket 20" out loud. This replaces the prefixed random id (`MOTH-7f3a`) decided in ADR-0001.

**Blocked by:** 04 (moth new), 05 (moth list)

**Note:** Must land before 06 (ID resolution), whose criteria assume a random suffix and prefix matching. The trade being accepted: two branches can independently allocate the same number, and git will merge both files cleanly because their slugs differ. That is tolerable only because it is detectable — see the duplicate-reporting criterion below.

**Status:** ready-for-agent

- [ ] A new ticket takes the next unused number, derived from the tickets already on disk
- [ ] Numbers are zero-padded to three digits so a directory listing sorts correctly past ninety-nine
- [ ] A ticket's file is named `NNN-slug.md` and its frontmatter records the same number
- [ ] Two tickets sharing a number are reported rather than silently tolerated, on read
- [ ] Renumbering a duplicate rewrites every reference to it, so no reference silently points at a different ticket
- [ ] Whether an id prefix is used at all is a config choice, defaulting to none
- [ ] ADR-0001 is superseded by a new ADR recording why the earlier reasoning no longer holds
- [ ] The spec's ticket shape and Out of Scope entries reflect the new scheme
