# Spec: moth v1

**Status:** ready-for-agent

## Problem Statement

A developer working with coding agents needs somewhere to keep track of work. The available options all fail in a specific way:

- **Hosted trackers** require an account, a network connection, and a signup flow before a single ticket exists. For a solo project or a repo that hasn't been pushed anywhere, that overhead is disproportionate to the work being tracked. The tickets also live somewhere the agent can't reach without credentials and an integration.
- **A folder of markdown files** has no such overhead, but it is a convention rather than a tool. Nothing enforces it. Session one's agent writes `status: todo`. Session three's agent, having never seen that file, writes `state: in_progress`. By session ten the folder is unqueryable, and the only way to answer "what's blocked?" is a grep that has to be re-derived from scratch every time somebody asks.
- **A `TODO.md`** works until there are more than about fifteen items, at which point it becomes a wall of text with no way to filter it.

The underlying problem is that agents are excellent at following a structure and terrible at inventing a consistent one across sessions that share no memory. A convention that depends on every future agent independently rediscovering it will drift, and the drift is silent — nothing fails, the data just stops being trustworthy.

## Solution

moth is an issue tracker that lives in the repo as markdown files, with the structure enforced by a CLI rather than by convention.

The enforcement is the product. moth rejects writes that a bare filesystem would accept: an unrecognised status, a field nobody declared, a parent that would create a cycle. An agent cannot invent `status: blocked` on a whim, because the write fails and tells it what the legal values are. What the agent *can* do is ask — `moth schema --json` returns every legal field and value for this repo, so a session with no memory of previous sessions can discover the rules in one call.

On top of that guarantee sits a query layer. Because the shape of the data is known, "show me unblocked urgent tickets" is a command rather than a grep an agent has to get right. That is the second half of the value: not just that the data is consistent, but that consistency makes it worth querying.

Everything else follows from those two ideas. Tickets are committed to the repo, so they travel with the code through branches, clones, and pull requests, and git provides history for free. The CLI is the only interface, because a filesystem layout optimised for `ls` is a filesystem layout compromised as a database. And the feature set is deliberately small: every workflow feature that would make moth harder for an agent to use correctly was cut.

## User Stories

1. As a developer, I want to start tracking work with a single command in an existing repo, so that I don't need an account, a network connection, or a signup flow.
2. As a developer, I want moth to ask me its setup questions interactively on first run, so that I don't have to read documentation to configure it.
3. As a developer, I want my tickets committed alongside my code, so that they travel with the repo through clones, branches, and pull requests.
4. As a developer, I want to choose my own ticket ID prefix, so that IDs read naturally for my project.
5. As a coding agent, I want to create a ticket with only a title, so that filing work is cheap enough that I actually do it.
6. As a coding agent, I want to pipe a multi-paragraph description into a new ticket via stdin, so that markdown containing quotes, backticks, and code fences survives intact instead of being mangled by shell quoting.
7. As a coding agent, I want every command to work without an interactive prompt, so that I never deadlock waiting on input I cannot provide.
8. As a coding agent, I want to query the schema for this repo, so that I can discover the legal fields and values without guessing or reading config by hand.
9. As a coding agent, I want writes containing unrecognised fields to be rejected with an error naming the offending key, so that I cannot silently corrupt the structure for future sessions.
10. As a coding agent, I want writes containing an unrecognised status to be rejected with the legal values listed, so that I can correct myself in one retry.
11. As a developer, I want to define my own workflow statuses, so that moth fits how my project actually works.
12. As a coding agent, I want every status to belong to one of six fixed categories, so that I can query "what work has started?" in any repo without knowing that repo's status names.
13. As a developer, I want to declare custom fields in config, so that I can track something moth doesn't model without abandoning enforcement.
14. As a developer, I want undeclared fields rejected even though custom fields exist, so that configurability never becomes drift.
15. As a developer, I want free-form labels, so that I have an escape hatch that requires no configuration at all.
16. As a developer, I want to list tickets filtered by status, category, priority, or label, so that I can see the slice I care about.
17. As a developer, I want tickets listed grouped by status with aligned columns, so that the default view is readable without passing any flags.
18. As a coding agent, I want `--json` on every read command, so that I can parse results without scraping formatted output.
19. As a coding agent, I want data on stdout and diagnostics on stderr, so that I can pipe moth's output without contaminating it.
20. As a coding agent, I want colour and decoration suppressed when output is not a terminal, so that I get clean text without passing a flag.
21. As a developer, I want to search ticket titles and bodies, so that I can find a ticket whose ID I don't remember.
22. As a developer, I want to reference a ticket by an unambiguous prefix of its ID, so that I don't have to type the whole thing.
23. As a developer, I want an error when a prefix matches more than one ticket, so that I never act on the wrong one by accident.
24. As a coding agent, I want to record that one ticket blocks another, so that the dependency is data rather than prose in a description.
25. As a developer, I want to list only blocked or only unblocked tickets, so that I can see what is actually startable right now.
26. As a coding agent, I want to break a ticket into sub-tickets, so that a large piece of work has somewhere structured to be decomposed.
27. As a developer, I want a parent-child relationship that would form a cycle to be rejected, so that the hierarchy is always traversable.
28. As a coding agent, I want to append notes to a ticket, so that I can record findings mid-task without rewriting the whole file and risking clobbering it.
29. As a coding agent, I want every mutation to print the resulting ticket, so that I can confirm the change without a second command.
30. As a coding agent, I want repeating a mutation that is already applied to succeed rather than error, so that retrying is safe.
31. As a developer, I want to cancel a ticket rather than delete it, so that the decision not to do something is preserved.
32. As a developer, I want a delete command for genuine mistakes, so that test tickets don't pollute the backlog forever.
33. As a developer, I want a command that validates the whole ticket store, so that I can detect dangling references and invalid data before they compound.
34. As a coding agent, I want validation to be runnable before I report a task complete, so that I don't hand back a corrupted store.
35. As a developer, I want dangling blocking references to warn rather than fail, so that working on a feature branch whose blocker exists only on another branch isn't an error state.
36. As a developer, I want a markdown board printed to stdout, so that I can commit a human-readable view for people browsing the repo on the web.
37. As a developer, I want two agents creating tickets on separate branches to merge without conflict, so that parallel work doesn't corrupt the backlog.
38. As a developer, I want help text with a worked example on every command, so that both I and an agent can learn the interface without external documentation.
39. As a coding agent, I want documented exit codes that distinguish a failed operation from a usage error, so that I can tell "I called this wrong" from "this legitimately failed".
40. As a developer, I want the tool to start fast, so that a session making dozens of calls doesn't accumulate noticeable delay.

## Implementation Decisions

### Language and distribution

TypeScript, compiled to a single binary with Bun. Measured on the target machine against a 200-ticket store: a native binary completes a list-and-filter in ~5 ms, Bun in ~19 ms, Node in ~60 ms. The Bun-to-native gap of ~14 ms is immaterial next to model latency; Node's ~53 ms of startup is not, which is what rules Node out. The cost of Bun is binary size — ~61 MB against ~477 KB for a native build — accepted because npm and Homebrew installs cache it. Distributed via Homebrew, a `curl` installer, and an npm package vendoring the binary so `npx` works without paying Node's startup cost at runtime.

The logic is file I/O, parsing, and filtering. If size or speed ever justifies it, a port is contained rather than a rewrite.

### Storage

Config lives at `moth.config.yml` in the repo root, where a tool's configuration is looked for, and it names the directory tickets live in — `.moth/` by default, but a repo may choose `tickets/` or anything else. The two go together: once the directory is configurable, moth can no longer find its config by looking inside a fixed directory, so the config has to sit somewhere known. Tickets are one markdown file each, flat in that directory, YAML frontmatter for structured data and the body for the description. Commands run from a subdirectory walk up to find the root.

**The filesystem is a database, not a user interface.** Status is a frontmatter field, not a directory. Directory-as-status would create two sources of truth that can drift, would break single-file reads (an agent reading one file could no longer see its status), would make every status change a git rename, and would privilege one of six queryable dimensions for no reason. The legible view is a command, not `ls`.

**No central index file.** Nothing that every write touches. An index, a counter, or a generated board committed by moth itself would conflict on every parallel branch, and that would be the most-hated thing about the tool.

Filenames are `NNN-slug.md`. The slug is derived from the title and re-synced whenever moth changes the title, so a directory listing never misinforms. A frozen slug was tried first and reversed; see ADR-0005. Because moth cannot see a title edited by hand in an editor, `moth check` reports slug drift and repairs it, the same way it reports duplicate numbers. The number is authoritative; the slug is derived.

`created_at` and `updated_at` are stored in frontmatter. Deriving them from git would mean one git invocation per ticket on every list.

### Ticket identity

Tickets are numbered sequentially and stored as `NNN-slug.md`, zero-padded to three digits so a directory listing sorts correctly past ninety-nine. The number is the id; a configured prefix, if any, is presentation applied to filenames and output, and defaults to none.

A random suffix was chosen first and reversed; see ADR-0004. The residual hazard is that two branches can allocate the same number and git will merge both files cleanly, since their slugs differ. That is tolerable only because reading the store reports numbers held by more than one ticket, making the collision loud at the next command.

### Schema and enforcement

Six **status categories** are fixed and not configurable: `backlog`, `unstarted`, `started`, `completed`, `canceled`, `duplicate`. `duplicate` is separate from `canceled` because the distinction is real: canceled work is not happening, duplicated work is happening under a different ticket. All three are terminal for the purposes of blocking. A repo names its own statuses within them, so a repo may define "In Review" inside `started`. Queries work on categories, so a query written against categories is portable across every repo; queries against status names are not, and that is the intended trade.

Priority is a fixed enum including an explicit "none", which is the default. Defaulting to a middle value would mean agents fill the field arbitrarily and the signal is lost.

Custom fields are permitted but must be **declared in config**. moth rejects any write containing an undeclared key. The opinion is not "no custom fields" — it is "no undeclared fields", which is what keeps the schema knowable in advance. Labels are free-form and are the escape hatch to reach for first.

The shape of a ticket, which encodes several of the above decisions more precisely than prose:

```yaml
---
id: 20                     # the number is the id; padding and prefix are presentation
title: Reject writes containing undeclared fields
status: in-progress        # a repo-defined status; its category is resolved via config
priority: high             # none | low | medium | high | urgent
labels: [cli, validation]  # free-form
parent: 12                 # optional, at most one level of nesting
blocked_by: [18]           # forward direction only; the reverse is derived on read
created_at: 2026-08-30T11:04:22Z
updated_at: 2026-08-30T14:51:09Z
---

Body is the description. `## Notes` accumulates appended findings.
```

A ticket cannot exist without a title: it is the only field a caller must supply, and moth refuses a creation that omits it. These are the whole of a v1 ticket's structured fields. There is no assignee, no routing or readiness field, and no stored activity. Anything else a repo needs is either a label or a custom field declared in config.

The config it is validated against, written by `moth init` and hand-edited thereafter:

```yaml
# moth.config.yml
prefix: ""                 # optional display prefix, e.g. ENG-020
tickets: .moth             # where ticket files live, relative to this file
statuses:
  - name: backlog
    category: backlog        # the six categories are fixed; the names are the repo's
  - name: in-progress
    category: started
```

### Relationships

Blocking is a relation, not a status: a ticket can be simultaneously unstarted and blocked, or started and blocked, and collapsing that into the status enum would corrupt the category model. `blocked_by` is stored in one direction only and the reverse is derived at read time — storing both would mean two file writes per link, two things that can drift, and twice the merge surface.

Dangling blocking references warn rather than error. On a feature branch, pointing at a ticket that exists only on another branch is a normal transient state, and hard-failing would make moth unpleasant to use exactly when it should be helping.

Sub-tickets nest **one level only**. Arbitrary trees complicate every list view and traversal for a case that rarely earns it. Cycles are rejected at write time.

There is no project or epic concept above the ticket. Labels already group, and a project concept would require a registry, project statuses, and project queries.

### Command surface

Modelled on `gh`: noun-verb (`moth ticket create`), with top-level aliases for the dominant noun (`moth new`, `moth list`, `moth show`, `moth move`, `moth edit`, `moth append`). Matching the shape of the most widely-known issue-tracker CLI means agents guess the interface correctly on the first attempt, which is worth more than any originality here.

Conventions, all of which exist to make the tool safe for a non-interactive caller:

- stdout carries data; stderr carries everything else.
- `--json` on every read command, implying no colour and no decoration.
- Colour and progress output are suppressed automatically when stdout is not a terminal.
- Exit codes: `0` success, `1` operation failed, `2` usage error. Documented, because agents branch on them.
- No command prompts interactively, with exactly one exception: `moth init`, which is human-only setup.
- Every mutation prints the resulting ticket, so confirming a change never costs a second invocation.
- Mutations are idempotent. Moving a ticket to a status it already occupies exits `0`. Agents retry, and a retry should not look like a failure.

`moth check [--fix]` validates the store: dangling blocking references, parent-child cycles, undeclared fields, statuses not present in config. Aliased as `doctor`, which is the word people reach for, though `check` is the more accurate name since it validates data rather than an installation.

`moth board` prints a markdown board to stdout. It is derived and never authoritative; committing it is the user's choice via their own hook, which keeps it out of moth's write path and off the list of things that can conflict.

### Interface scope

The CLI is the only interface. There is no TUI, which would be a second complete interface competing for the same job before the data model has been proven. There is no MCP server: it would load tool schemas into context in every session to expose operations an agent can already discover from `--help`, and the CLI is strictly cheaper.

Because no skill ships with moth, **`--help` is load-bearing** — it is both the API reference and the only place usage guidance can live. Every command's help text requires a worked example, and this is a v1 requirement rather than polish.

### Git

moth never invokes git. Tickets live in a git repo and git tracks them, but no moth command shells out, reads git state, or installs hooks. This fell out of cutting git integration and the activity log, and it is worth preserving: it removes an entire category of failure and makes every test a plain temp directory.

History is git's job. `git log -p` on a ticket file is already a complete, attributed, timestamped record of every change, so moth stores no activity log and models no comments. Notes append to the body instead.

## Testing Decisions

### What makes a good test here

Tests assert on **external behaviour**: what a caller passed in, what came out, and what ended up on disk. They do not assert on internal function calls, module boundaries, or intermediate representations. A test that would break when the frontmatter parser is swapped, while the CLI's behaviour is unchanged, is testing the wrong thing.

Every assertion targets one of two observable surfaces: **the output** (stdout, stderr, exit code), which is what an agent consumes, and **the files on disk**, which are the actual store. Both matter, and they can diverge — a command that prints success while writing nothing is precisely the bug worth catching, and only asserting on both finds it.

### The seam

**One primary seam: `run(argv, io)`** — a single in-process entry point taking an argument vector plus an injected environment (working directory, stdout, stderr), returning an exit code. Tests construct a temp directory, invoke `run`, and assert against captured output and the resulting files.

This is the highest seam that stays fast and debuggable. It exercises everything moth controls: argument parsing, schema validation, the query layer, output formatting, file I/O, and exit codes. Injecting the working directory rather than relying on `process.cwd()` is what makes tests parallelisable and independent.

**The filesystem is never mocked.** What moth writes to disk *is* the product, and a mocked filesystem would test a fiction of it. Real temp directories are fast enough that there is no reason to.

**No git fixtures**, because moth never invokes git.

### The smoke layer

A small number of tests — on the order of five — run the actual compiled binary as a subprocess. They exist to cover the one thing the in-process seam cannot: that the artifact being shipped starts at all. Binary builds, shebang resolves, `--version` and `--help` respond, an exit code propagates through the process boundary, stdin piping works end to end.

Without this layer, a broken build or a bad shebang passes CI green. With it, the whole suite stays fast because only a handful of tests pay for a subprocess.

### Prior art

None. This is a greenfield repo, so these are the conventions being established rather than conventions being followed. `bun test` is the runner, being built into the chosen toolchain.

## Out of Scope

Each of these was considered explicitly and cut. They are recorded here so they are not silently reintroduced.

- **Assignees.** No user registry, no accounts, no "me". Nothing in moth records who is working on what; coordination lives outside it.
- **A `moth next` command.** Composable filters on `moth list` cover it.
- **Git integration.** No branch creation, no branch-name parsing, no auto-transition on commit or merge. Hooks are per-clone and therefore unreliable, and tickets changing status without anyone asking contradicts the passive model.
- **An activity log and comments.** Git is the history; notes append to the body.
- **A TUI.**
- **An MCP server.**
- **A shipped agent skill.** `--help` carries this burden instead.
- **Projects, epics, initiatives, cycles, sprints, estimates, and story points.**
- **Manual ticket ordering.** A rank value across many files rewrites on every reorder, which is the merge-hostile shared state moth exists to avoid. Priority plus age is the ordering.
- **Nesting beyond one level.**
- **Storing tickets outside the repo.** Considered as a way to make sequential ids collision-free; rejected because tickets travelling with the code is the point, and supporting both modes would be the anti-opinionated move.
- **A routing or readiness field.** Considered as `ready-for-agent` / `ready-for-human`, following the triage roles moth's interim tracker uses. Rejected for two reasons: the `backlog`/`unstarted` boundary already encodes the triage decision, so it would be a second field expressing a distinction the categories carry; and an agent-versus-human split encodes a capability boundary that moves every few months, which is a poor thing to freeze into a fixed, non-configurable schema. Anyone wanting the signal can use a label. Reconsider from evidence in real use, not from prediction.
- **A claim field.** Moving a ticket into a `started` status is the claim. A dedicated `claimed_by` brings stale-claim handling — timeouts, manual clearing — for a problem an ordinary stale `in-progress` ticket already expresses in a way people know how to resolve.
- **A `duplicate_of` relation.** moth takes Linear's `duplicate` status category but not the pointer Linear pairs it with, so a duplicated ticket records *that* it is a duplicate and not *of what*. The argument for adding it is that agents filing tickets will duplicate existing ones often, and the blocking graph could then traverse through a duplicate to its canonical ticket. Left out as a third relation type; the strongest candidate for the first post-v1 addition.
- **Importing from an existing tracker.**

## Further Notes

**Dogfooding is the v1 completion criterion.** moth is being built with its own backlog tracked as markdown files under `.scratch/`, in a format that is an unenforced approximation of what moth produces: sequential numbering, `Status:` lines, `Blocked by:` as prose. When moth can list and filter, that backlog migrates into `.moth/` and the interim tracker configuration is retired. That migration is the most honest test of whether v1 is actually usable.

**A known gap in that migration.** The interim tracker's protocol includes a *claim* operation — marking a ticket as taken before work starts, so two agents don't collide on it. moth as specified cannot express this, because assignees are out of scope, so there is nothing to claim with. This is the first concrete cost of that cut. It is cheap to close later with a single field or a dedicated command, and is recorded here so it is recognised as a known omission rather than rediscovered as a bug.

**Commit conventions.** Conventional Commits, no body, no footer. Enforcement via commitlint and lefthook is intended and belongs in the backlog rather than being assumed.

**On the 61 MB binary.** This is the one clearly suboptimal consequence of the toolchain choice. It is acceptable because most installs are cached, and it is the number to watch if the `curl`-into-a-container path turns out to matter more than expected.
