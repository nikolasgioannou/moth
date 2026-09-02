---
id: "16bd00"
title: The npm shim costs 43ms per invocation
status: backlog
priority: medium
labels:
  - distribution
created_at: 2026-09-02T19:53:06.235Z
updated_at: 2026-09-02T19:53:06.235Z
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

- [ ] A decision is recorded, with the measurement behind it
- [ ] If a shim is changed, the overhead is measured again on macOS, Linux and Windows
- [ ] `moth --version` through npm and through the raw binary are within a few ms, or the gap is documented where an npm user will meet it
- [ ] Windows is verified, not assumed
