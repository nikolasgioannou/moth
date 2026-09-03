---
id: "421fa6"
title: The test suite fails intermittently under load
status: backlog
priority: high
labels:
  - testing
created_at: 2026-09-03T01:15:47.653Z
updated_at: 2026-09-03T01:15:47.653Z
---

The suite has failed three times today and passed on every re-run, each time with no test named in the output. It is not one test: the failures have been in different places, and the only common factor is that something else was writing to `dist/` or building a binary at the same time.

Two candidates, both shared state:

- `test/build.test.ts` asserts that building leaves the repo root and the tracked tree untouched. It runs real builds. Another build running concurrently — `bun run build:npm`, or `test/binary.test.ts` — would make those assertions read a directory mid-write.
- `test/binary.test.ts` compiles a binary in `beforeAll`. That was already given a 120s timeout for the same reason, which was a symptom of the same shared state rather than a fix for it.

A suite that fails occasionally and passes on a re-run is worse than one that fails honestly: it teaches everyone to re-run and shrug, and a real regression then hides in the noise.

**What to build**

Find the shared resource and remove the sharing. Likely a scratch directory per test rather than a fixed `dist/`, so builds cannot observe each other.

**Done when**

- [ ] The cause is identified, not guessed
- [ ] The suite runs clean repeatedly under load, e.g. alongside a concurrent build
- [ ] No test writes to a path another test reads
- [ ] The `binary.test.ts` timeout is revisited: if the real cause was contention rather than a slow compile, that 120s is covering for it
