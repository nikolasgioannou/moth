---
id: "309779"
title: Parent and blocker ids are written unquoted and read back as numbers
status: done
priority: urgent
labels:
  - cli
created_at: 2026-09-05T04:04:11.125Z
updated_at: 2026-09-05T04:07:26.420Z
---

ADR-0003 records that an id like `22739e` is a string to one YAML writer and a number to another parser, which drops the trailing character. The fix quoted the `id` field. It did not quote the fields that *hold* ids.

```
id: "66428e"        <- quoted
parent: 66428e      <- not quoted
```

`Bun.YAML.parse` reads that `parent` as the number `66428`, so `ticket.parent === child.id` is false and the link is gone. `blocked_by` entries have the same defect.

Measured over 200,000 random ids: **8.93% do not survive the round trip.** `50735e` becomes `50735`, `0e9191` becomes `0`, and `2e5243` becomes `null`.

Consequences seen: a sub-ticket silently detached from its parent, and the one-level nesting rule bypassed because the parent looked childless. `moth check` would report dangling blockers for tickets whose blockers exist.

Found by chasing an intermittent test failure — `parent.test.ts` failed roughly 1 run in 10, because the bug only fires when a randomly generated id takes one of the affected shapes.

**What to build**

One place that quotes every field holding an id — `id`, `parent`, and each entry of `blocked_by` — used by both `writeTicket` and the direct write in `moth new`. The two writers currently quote independently, which is how one of them was missed.

**Done when**

- [x] `parent` and `blocked_by` are written quoted
- [x] Both writers go through the same quoting, rather than each doing it
- [x] A regression test pins an id of an affected shape and asserts the link survives a round trip
- [~] Files already written keep bare ids, but only shapes the writer left bare and the reader misreads are actually broken — and `moth check` now reports those as a dangling parent. Any edit rewrites the file quoted.


## Notes

The measurement in the description was wrong and is corrected here. 8.93% was the rate at which the *parser* misreads a bare id, but the `yaml` writer quotes most of those shapes itself. Through the real write-then-read path the rate is **0.60%**, and the shape is narrow: digits followed by a trailing `e`, such as `50735e` or `97333e`. The writer emits those bare and the parser reads them as numbers.

That 0.6% is exactly why `parent.test.ts` failed about one run in ten and passed on every re-run: three random ids per test, and only some shapes trip it.

Two things came out of chasing it. `moth check` reported dangling blockers but not dangling parents, so a broken parent link looked like a healthy store — now reported. And the three regression tests were each verified to fail with the fix reverted, which caught one of them pinning `0e9191`, a shape the writer quotes anyway and which therefore guarded nothing.
