---
id: "08812d"
title: Building leaves no artifacts behind
status: done
priority: none
labels: []
created_at: 2026-08-30T23:31:01.451Z
updated_at: 2026-08-30T23:31:02.630Z
blocked_by:
  - "c41227"
---

**What to build:** Building, and running the test suite, leave the repository as they found it. Today each `bun build --compile` abandons a 63 MB temp file in the repo root; the test suite builds the binary too, so an afternoon's work accumulated 81 files and 4.8 GB.

- [x] Building leaves no `.bun-build` temp file in the repo root
- [x] Running the test suite leaves none either, including when a test fails part way
- [x] Repeated builds do not accumulate files
- [x] The repository is byte-identical before and after a build, ignoring the intended output
