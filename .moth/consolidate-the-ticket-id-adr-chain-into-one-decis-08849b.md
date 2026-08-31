---
id: "08849b"
title: Consolidate the ticket-id ADR chain into one decision
status: done
priority: none
labels:
  - docs
created_at: 2026-08-31T15:05:53.285Z
updated_at: 2026-08-31T15:40:27.156Z
---

Three ADRs describe one decision: the first chose random ids, the second superseded it with sequential numbers, and the third superseded that with random hex. A reader who wants to know how ids work today must read three documents in reverse order and discard two, and the superseded pair still read as current — the first advertises prefix matching that no longer exists.

**What to build**

Collapse the chain into one current ADR on ticket ids: the decision as it stands, plus a short history of the two reversals and which premises changed each time. Retire the superseded pair rather than leaving full documents that must be read to be discarded.

Keep the supersession convention in `docs/adr/README.md` intact for genuine future reversals. The problem is a three-link chain about one question, not the convention.

**Done when**

- [ ] One ADR states how ids work today
- [ ] Both reversals and their changed premises are recorded in it
- [ ] No ADR that reads as current describes removed behaviour
- [ ] Links from other docs still resolve
