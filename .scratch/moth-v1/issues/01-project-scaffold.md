# 01: Project scaffold and the run(argv, io) seam

**What to build:** A developer can clone the repo, install dependencies, run the test suite, and build a binary that answers `moth --version`. This is the thinnest complete path through every layer, and it establishes the single testing seam every later ticket depends on.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `moth --version` prints the version and exits 0, both in-process and from the compiled binary
- [ ] A single entry point accepts an argument vector plus an injected working directory, stdout, and stderr, and returns an exit code
- [ ] Tests run from a clean checkout with one command and pass
- [ ] At least one test drives the in-process entry point; at least one runs the compiled binary as a subprocess
- [ ] An unrecognised command exits 2 and writes its message to stderr, not stdout
