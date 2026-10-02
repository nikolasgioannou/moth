---
id: "67290b"
title: Alpine support is verified by hand, not by CI
status: done
priority: medium
labels:
  - distribution
created_at: 2026-09-03T01:07:10.653Z
updated_at: 2026-10-02T01:06:49.433Z
---

Alpine support is verified only by hand. Nothing in CI runs moth on a musl system, so a broken musl binary can ship without anything failing.

This gap was found by a spec review: ticket `ff274e` carried a criterion reading "Verified in Alpine containers", which was true of a person at a terminal and untrue of the repository.

**Scope**

The realistic way this breaks is not a change to moth. The libc detection in `install.sh` and the npm launcher has not changed since it landed. What can change silently is Bun: CI and the release take `bun-version: latest`, and Bun decides what the musl target links against (today `libstdc++` and `libgcc`). A Bun upgrade can break the musl binary with no moth commit to point at.

So this is one smoke test that gates the release, not a matrix of container jobs. The npm-in-Alpine path, the `ldd`-absent branch of `install.sh`, and a deliberately broken libc mapping were in the original scope and were dropped as more machinery than the risk justifies.

**Done when**

- [x] The release workflow runs `moth-linux-x64-musl` in an `alpine` container after building and before publishing: `init`, `new`, `list` and `check`
- [x] A failure stops the release
- [x] The test can fail: without `libstdc++` the same binary exits 127. Verified locally.
