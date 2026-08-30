# TypeScript on Bun, despite native being measurably faster

moth is written in TypeScript and compiled to a single binary with Bun, even though a native-compiled language benchmarked roughly four times faster on the real workload.

## Considered options

Measured on a 200-ticket store, listing and filtering: **native ~5 ms, Bun ~19 ms, Node ~60 ms**. Startup alone: native ~2.7 ms, Bun ~12 ms, Node ~53 ms.

Native won on speed and lost on relevance. The Bun-to-native gap is ~14 ms per invocation; at fifty invocations in an agent session that totals under a second, against model latency measured in seconds per turn. Node's ~53 ms of startup is the number that actually disqualifies it. The remaining criterion was development velocity on a greenfield project whose design is still moving, and TypeScript won that outright.

## Consequences

The compiled binary is ~61 MB against ~477 KB for a native build. This is accepted because Homebrew and npm installs are cached, and it is the number to watch if installing into fresh CI containers turns out to matter more than expected.

Recorded because the obvious reading of the benchmark is that we picked the slower option by mistake. moth's logic is file I/O, parsing, and filtering, so if size or speed ever justify it, a port is contained rather than a rewrite.
