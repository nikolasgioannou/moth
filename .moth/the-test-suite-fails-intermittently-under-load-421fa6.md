---
id: "421fa6"
title: The test suite fails intermittently under load
status: done
priority: high
labels:
  - testing
created_at: 2026-09-03T01:15:47.653Z
updated_at: 2026-09-03T01:26:16.706Z
---

The suite has failed three times today and passed on every re-run, each time with no test named in the output. It is not one test: the failures have been in different places, and the only common factor is that something else was writing to `dist/` or building a binary at the same time.

Two candidates, both shared state:

- `test/build.test.ts` asserts that building leaves the repo root and the tracked tree untouched. It runs real builds. Another build running concurrently — `bun run build:npm`, or `test/binary.test.ts` — would make those assertions read a directory mid-write.
- `test/binary.test.ts` compiles a binary in `beforeAll`. That was already given a 120s timeout for the same reason, which was a symptom of the same shared state rather than a fix for it.

A suite that fails occasionally and passes on a re-run is worse than one that fails honestly: it teaches everyone to re-run and shrug, and a real regression then hides in the noise.

**What to build**

Find the shared resource and remove the sharing. Likely a scratch directory per test rather than a fixed `dist/`, so builds cannot observe each other.

**Done when**

- [~] One cause identified with evidence. Two local occurrences were never reproduced and remain unexplained.
- [x] 20+ consecutive clean runs, including one alongside eight concurrent compiles and a docker pull
- [x] `build.test.ts` no longer writes the `dist/moth` that `binary.test.ts` builds and runs
- [x] Revisited. The 120s is right, but for a reason the original comment got wrong.


## Notes

**The identified cause: a cold compiler, not contention.** `bun build --compile` downloads the Bun runtime the first time a machine compiles, and that download is charged to whichever test triggers it. Measured: **75ms idle locally, where it is cached, against 6420ms in CI**, where it is not — against a 5000ms default timeout. That is what failed the first time, and `build.test.ts` had the same exposure across four untimed tests. All five now carry an explicit timeout with the measurement written beside them.

The original comment on `binary.test.ts` blamed "a compile alongside the rest of the suite", which was a guess and was wrong: a loaded compile measures 244ms here, nowhere near the limit. The number was right for the wrong reason, which is worth more than a wrong number, but only just.

**Not reproduced.** Two local failures, both one test, neither named in captured output. Twelve consecutive runs, then eight more, then one under eight concurrent compiles and a docker pull: all clean. The shared `dist/moth` path between `build.test.ts` and `binary.test.ts` was a real hazard and is gone, but it was safe in practice because Bun runs test files sequentially in one process — verified, not assumed.

**Left standing, deliberately.** `test/helpers/tmp.ts` keeps one module-level array of directories, and every file's `afterAll` drains all of it. That is only safe because files run sequentially; if Bun ever parallelises them, one file's cleanup deletes another's fixtures. Not the cause here, and changing it now would be a fix for a bug nobody has, so it is written down rather than pre-empted.

**If it recurs**, capture the full output rather than the exit code — the two unexplained runs were lost because only the summary was kept.
