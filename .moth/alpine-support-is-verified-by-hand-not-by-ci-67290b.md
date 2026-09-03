---
id: "67290b"
title: Alpine support is verified by hand, not by CI
status: backlog
priority: medium
labels:
  - distribution
created_at: 2026-09-03T01:07:10.653Z
updated_at: 2026-09-03T01:07:10.653Z
---

Alpine support is verified only by hand. Nothing in CI runs moth on a musl system, so the next change to the build targets, the npm packaging, or `install.sh` can break it silently and the break ships.

This gap was found by a spec review: ticket `ff274e` carried a criterion reading "Verified in Alpine containers", which was true of a person at a terminal and untrue of the repository.

**What to build**

A CI job that runs the real artefacts on Alpine, not a build that merely targets it:

- Build the musl binary, run it in an `alpine` container, and assert `moth init`, `moth new`, `moth list` and `moth check` all succeed
- Cover the bare image, so the missing `libstdc++` path stays exercised and `install.sh` keeps warning about it
- Cover the npm path too: install the packed wrapper and platform packages in `node:*-alpine` and assert the launcher resolves the `-musl` package by name, not merely that it runs

**Worth knowing**

The glibc and musl builds fail in opposite directions, so a test asserting only "it runs" on one image can pass while the other is broken. Assert which package or asset was chosen, not just the exit code.

`install.sh` has two detection branches — `ldd` present and absent — and only the first is exercised by an ordinary Alpine image. The second needs `ldd` removed to reach.

**Done when**

- [ ] CI runs moth on Alpine against the musl artefacts
- [ ] The assertions name the chosen package or asset, not just the exit code
- [ ] Both `install.sh` detection branches are covered
- [ ] A deliberately broken libc mapping fails the job, proving the test can fail
