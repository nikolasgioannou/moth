---
status: accepted
---

# moth open: a read-only, live view of the store for people

`moth open` starts a local web server and opens the store in a browser. The page is read-only and updates live as tickets change on disk. The CLI stays the only way to change a ticket.

This reverses part of the v1 spec, which made the CLI the only interface and listed a TUI as out of scope because it "would be a second complete interface competing for the same job before the data model has been proven."

## Considered options

**The v1 position, a CLI and `moth board` only,** fits an agent and leaves its human with little to look at. Agents do most of the writing in a moth repo, and the person directing them reads far more than they write. `moth list` and `moth show` answer one question per call, and `moth board` is a snapshot that is stale as soon as an agent moves a ticket. Neither shows how the work fits together: a parent with its sub-tickets, which blockers hold what, and what changed in the last minute.

The objection to a second interface was that it would compete for the same job. The premises have moved on both sides. The data model has shipped through seven releases and tracked fifty tickets on moth itself, and the job is not the same: the CLI is where tickets are written, by agents, and this is where a person reads them.

**A TUI** was the interface the spec cut by name. A browser renders markdown bodies, lays out a sub-ticket tree and wraps long text without a layout engine of moth's own, and it can stay open in a window beside the terminal the agent is working in.

**A static HTML file**, a `moth board --html` written to disk, needs no server and no long-running process. It loses the one thing that makes the view worth having over `moth board`, which is seeing an agent's change the moment it lands.

**Writes from the page**, dragging a card between columns or editing a body in place, were left out. A page that writes is a second implementation of everything the CLI validates, and it is exactly the competing interface the spec warned against. The page shows the `moth` command for each action instead, which a person can run or hand to an agent. If writes are ever added, they go through the same command layer as the CLI, never a separate path.

**`moth serve`** was the obvious name and lost for being the name a developer uses for a dev server. The person running this wants to look at their tickets, and `open` is the verb they would use for that.

## Consequences

moth gets its first long-running process. It runs until interrupted, and the spec's rule that no command prompts still holds: it opens a browser when run at a terminal, `--no-open` suppresses that, and without a terminal it never tries.

The server binds to `127.0.0.1` only. That keeps the spec's rule that no command contacts the network, which is about requests moth makes, and nothing in the store is reachable from another machine.

The page's HTML, CSS and JavaScript are embedded in the binary, the same way the agent skill is, so an install has no asset directory to lose. Its data endpoints return the same JSON as `--json`, so there is one serializer and the page cannot disagree with the CLI about what a ticket is.

`run(argv, io)` stops being the only seam. The server's request handler is a plain function, tested in-process against a temp directory like every other command, with one or two smoke tests that start the real binary and fetch a page.

The page still never invokes git. A ticket's history from `git log` is the obvious next feature and stays out for the same reason the CLI has none: it would make git a dependency of the view.

`moth open` is a human command, like `moth init`. The Moth Method does not mention it, because an agent gets nothing from it that `moth list` and `moth show` do not already give.

The page lays tickets out in columns by status, which looks like a board but is not one. In the glossary a Board is the generated markdown that `moth board` prints, and it keeps that meaning.
