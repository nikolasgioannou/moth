---
id: "c41227"
title: Project scaffold and the run(argv, io) seam
status: done
priority: none
labels: []
created_at: 2026-08-30T23:31:00.216Z
updated_at: 2026-08-30T23:31:01.518Z
---

**What to build:** A developer can clone the repo, install dependencies, run the test suite, and build a binary that answers `moth --version`. This is the thinnest complete path through every layer, and it establishes the single testing seam every later ticket depends on.

- [x] `moth --version` prints the version and exits 0, both in-process and from the compiled binary
- [x] A single entry point accepts an argument vector plus an injected working directory, stdout, and stderr, and returns an exit code
- [x] Tests run from a clean checkout with one command and pass
- [x] At least one test drives the in-process entry point; at least one runs the compiled binary as a subprocess
- [x] An unrecognised command exits 2 and writes its message to stderr, not stdout
