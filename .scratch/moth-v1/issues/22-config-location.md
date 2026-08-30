# 22: Config at the repo root, ticket directory configurable

**What to build:** The config lives at `moth.config.yml` in the repo root, where a person expects to find a tool's configuration, and it names the directory tickets live in, so a repo can use `tickets/`, `.tickets/`, or anything else instead of `.moth/`.

**Blocked by:** 03 (moth init), 05 (moth list)

**Note:** The two halves depend on each other. Once the ticket directory is configurable, moth can no longer find its config by looking inside a fixed directory, so the config has to sit somewhere known — which is the argument for the repo root.

**Status:** ready-for-agent

- [ ] Config is read from `moth.config.yml` at the repo root
- [ ] The config names the directory tickets live in, defaulting to a sensible choice
- [ ] Init creates the ticket directory wherever the config points
- [ ] Every command finds the ticket directory through the config rather than a hardcoded path
- [ ] Running a command from a subdirectory still finds the repo root
- [ ] A config naming a directory that does not exist fails with a message saying which directory is missing
