# 21: Building leaves no artifacts behind

**What to build:** Building, and running the test suite, leave the repository as they found it. Today each `bun build --compile` abandons a 63 MB temp file in the repo root; the test suite builds the binary too, so an afternoon's work accumulated 81 files and 4.8 GB.

**Blocked by:** 01 (project scaffold)

**Status:** ready-for-agent

- [x] Building leaves no `.bun-build` temp file in the repo root
- [x] Running the test suite leaves none either, including when a test fails part way
- [x] Repeated builds do not accumulate files
- [x] The repository is byte-identical before and after a build, ignoring the intended output
