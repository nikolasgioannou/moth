---
id: "16bd00"
title: The npm shim costs 43ms per invocation
status: done
priority: medium
labels:
  - distribution
created_at: 2026-09-02T19:53:06.235Z
updated_at: 2026-09-03T00:26:42.491Z
---

The npm wrapper exposes `moth` as a `#!/usr/bin/env node` script that `spawnSync`s the real binary. Every invocation therefore pays Node startup plus a process spawn.

Measured on darwin-arm64, 25 invocations of `moth --version` each, against `moth-cli@0.3.1` installed from the registry:

```
via the npm shim        69.0 ms per invocation
the binary directly     25.7 ms per invocation
overhead                43.3 ms  (2.7x)
```

This matters more for moth than for most tools carrying the same shim. ADR-0002 rejected a Node implementation because "Node`s ~53 ms of startup is the number that actually disqualifies it", and accepted Bun by reasoning that a ~14 ms gap across fifty invocations in an agent session stays under a second. The npm shim hands ~43 ms of that back: roughly 2.2 s per session against the ~0.7 s the ADR was willing to pay. The distribution channel partly undoes the language decision the ADR turned on.

**Options**

1. **Keep the Node shim.** It is what esbuild, Biome and Rollup ship, and Node cannot exec-replace itself, so the cost is structural rather than an implementation flaw. Zero risk, zero gain.
2. **A `#!/bin/sh` shim using `exec`** on POSIX, with a generated `.cmd` for Windows. Removes both the Node startup and the second process, since `exec` replaces the shell rather than spawning. Faster on the overwhelming majority of installs, but two shims to maintain and npm`s Windows shim generation is the part to prove out.
3. **Say nothing in code and document it.** The README lists Homebrew first already, but never says npm is the slow path. An agent-facing tool should probably say so outright.

Option 2 with option 3 as the fallback if Windows proves awkward. Worth measuring the sh shim before committing: if `exec` puts npm within a few ms of the direct binary, the ADR`s reasoning is restored for every channel.

**Done when**

- [x] A decision is recorded, with the measurement behind it
- [x] No shim change, so nothing to re-measure
- [x] The gap is documented in the README, beside the npm install command
- [x] Windows is the reason the fast path was rejected, reasoned from npm's shim generation rather than assumed away


## Notes

**Decision: keep the Node launcher.** Measured in one run on darwin-arm64, 25 invocations each:

```
node shim (today)         45.8 ms
sh + exec shim            17.9 ms
binary directly           15.1 ms
```

So ~31ms of overhead against under 3ms for `sh` with `exec`. Tenfold, and still rejected.

`bin` in package.json takes a single path with no per-platform form. On Windows npm generates a `.cmd` that invokes whatever the shebang names, so a `#!/bin/sh` launcher would be fast on POSIX and broken on Windows, where `sh` is not present. One entry cannot be both.

Two caveats on the number. The 2.7ms is a floor: the prototype read the binary path from an environment variable, while a real sh launcher must also resolve its own symlink and detect libc. And the musl detection added for ticket ff274e calls `process.report.getReport()`, measured at 0.21ms on Alpine — 159 times a stat call, but half a percent of the total, so the standard detection stays rather than being traded for a fragile one.

What changed instead: the README now says, beside the npm install command, that the launcher adds roughly 30ms and that Homebrew or the install script give you the binary itself. The reasoning is in a comment above the launcher, so the next person to look at it finds the measurement rather than repeating it.
