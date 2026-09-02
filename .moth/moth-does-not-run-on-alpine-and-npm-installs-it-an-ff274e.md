---
id: "ff274e"
title: moth does not run on Alpine, and npm installs it anyway
status: backlog
priority: high
labels:
  - distribution
created_at: 2026-09-02T19:52:49.369Z
updated_at: 2026-09-02T19:52:49.369Z
---

The published Linux binaries are glibc-linked, and nothing stops npm installing them on a musl system.

```
$ file moth-linux-x64
ELF 64-bit LSB executable, x86-64, dynamically linked,
interpreter /lib64/ld-linux-x86-64.so.2, for GNU/Linux 3.2.0
$ strings moth-linux-x64 | grep GLIBC
GLIBC_2.2.5
GLIBC_2.3
```

On Alpine there is no `/lib64/ld-linux-x86-64.so.2`, so the kernel cannot load the interpreter and execution fails with `no such file or directory` — naming a file that plainly exists. It is one of the least legible errors in the ecosystem, and a user has no reason to connect it to libc.

Nothing prevents the bad install either. `scripts/npm-packages.ts` declares `os` and `cpu` on each platform package but no `libc`, so npm resolves `moth-cli-linux-x64` on Alpine and reports nothing wrong.

Alpine is the default base image across Docker and CI, which is exactly where agents run moth. This is an outright failure on a common platform, not a degradation.

**What to build**

- Add `bun-linux-x64-musl` and `bun-linux-arm64-musl` to the targets in `scripts/release-build.ts`, published as release assets alongside the others
- Publish `moth-cli-linux-x64-musl` and `moth-cli-linux-arm64-musl`, each declaring `libc: ["musl"]`
- Declare `libc: ["glibc"]` on the two existing Linux packages, so the choice is explicit on both sides
- Teach `install.sh` to detect musl, since the curl path has the same problem: `ldd --version` naming musl, or the absence of `/lib64/ld-linux-*`

**Worth knowing**

`libc` in a manifest is only honoured by npm 10.2 and later, pnpm, and Yarn 4. Older clients ignore it and will still install the glibc build on Alpine, so the shim in `scripts/npm-packages.ts` should also fail with a message naming musl rather than letting the loader error surface raw.

**Done when**

- [ ] musl binaries are built and attached to the release
- [ ] musl npm packages are published, declaring `libc: ["musl"]`
- [ ] The glibc packages declare `libc: ["glibc"]`
- [ ] `install.sh` picks the right binary on a musl system
- [ ] The shim reports a libc mismatch in terms a reader can act on, for clients that ignore `libc`
- [ ] Verified by running moth in an Alpine container
