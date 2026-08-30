# moth

moth tracks work as markdown files inside a repo, with structure enforced by a CLI rather than by convention. This glossary is the vocabulary that enforcement is described in; use these words in code, commands, errors, and docs.

## Language

### The unit

**Ticket**:
A single piece of work, stored as one markdown file.
_Avoid_: issue, task, card, story

**Store**:
The complete set of tickets in a repo.
_Avoid_: backlog, database, index

### Workflow

**Status**:
Where a ticket sits in this repo's workflow. Each repo defines its own.
_Avoid_: state, workflow state, stage

**Status category**:
One of six fixed groupings — backlog, unstarted, started, completed, canceled, duplicate — that every status belongs to. Identical in every repo, which is what makes a query portable. The last three are terminal: a ticket in them is finished with. Bare "category" always means this.
_Avoid_: status type, phase, bucket

**Backlog**:
The status category for work that is not yet queued. Never a name for the store.
_Avoid_: using it to mean every ticket

### Schema

**Declared field**:
A field named in the repo's config, and therefore permitted on a ticket.

**Undeclared field**:
Any field not named in the repo's config. Rejected on write and reported on read.

**Label**:
A free-form tag on a ticket, needing no declaration.
_Avoid_: tag, category

### Relationships

**Blocker**:
A ticket that must reach a terminal category — completed, canceled, or duplicate — before another ticket can begin.

**Blocked**:
Having at least one blocker outstanding. Orthogonal to status — a ticket can be blocked in any status.
_Avoid_: startable, ready, waiting

**Sub-ticket**:
A ticket whose parent is another ticket. Nesting is one level deep.
_Avoid_: sub-issue, subtask, child ticket

### Artifacts

**Slug**:
The readable part of a ticket's filename, derived from its title. Re-synced when moth changes the title, so it does not drift. Never authoritative; the number is.

**Board**:
A generated markdown view of the store. Derived output, never a source of truth.
_Avoid_: view, report, dashboard
