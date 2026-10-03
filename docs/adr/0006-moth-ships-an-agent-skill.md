---
status: accepted
---

# moth ships an agent skill

moth ships the Moth Method: one skill, in the open Agent Skills format, at `skills/moth-method/SKILL.md`. It says how to work with moth, not what moth's commands are. It is installed either with `npx skills add nikolasgioannou/moth`, which reads the repository, or with `moth skill install`, which writes the copy embedded in the running binary.

## Considered options

**`--help` carries the burden** was the v1 position, listed in the spec as out of scope. Evidence from real use overturned it. An agent tracking a 163-ticket project learned the commands it first needed and never read further: it asked for `moth check --fix` and `moth list --unblocked` as new features, kept a hand-written plan to decide what came next, and appended to tickets with shell heredocs. Each of those was answered somewhere in `--help`, and none of it helped, because help answers "how does this command work" and the agent's question was "how do I work". A method, loaded before the agent touches a ticket, is the place that question is answered.

**Only `npx skills add`** costs nothing and reaches every agent that reads the format, but it installs from the repository's default branch, which can be ahead of or behind the moth a user actually has. The method names commands and flags, so a mismatch teaches the agent something false. `moth skill install` writes the copy built into the binary, so it always matches; `moth upgrade` followed by `moth skill install` keeps them in step.

**A Claude Code plugin marketplace** was not taken up: it reaches one agent, and `npx skills` already installs for Claude Code.

## Consequences

`moth skill install` is the second command that can prompt, after `moth init`. It asks which agents and where only when run at a terminal with no flags saying so; without a terminal it refuses with a usage error naming the flags, so the spec's promise that an agent never deadlocks on input still holds.

A repo install goes beside `.moth/`, into `.claude/skills/` or `.agents/skills/`, so the method is committed with the tickets it describes. `--global` installs under the user's home instead, in each agent's own directory.

A test extracts every `moth <command> --flag` from the method's code and fails if any is not in that command's help, so the method cannot drift from the CLI unnoticed. The release script stamps the version into the method's `moth-version`, and a test requires it to match `package.json`.
