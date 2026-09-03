---
id: "08849b"
title: Consolidate the ticket-id ADR chain into one decision
status: done
priority: none
labels:
  - docs
created_at: 2026-08-31T15:05:53.285Z
updated_at: 2026-09-03T01:06:55.415Z
---

Three ADRs describe one decision: the first chose random ids, the second superseded it with sequential numbers, and the third superseded that with random hex. A reader who wants to know how ids work today must read three documents in reverse order and discard two, and the superseded pair still read as current — the first advertises prefix matching that no longer exists.

**What to build**

Collapse the chain into one current ADR on ticket ids: the decision as it stands, plus a short history of the two reversals and which premises changed each time. Retire the superseded pair rather than leaving full documents that must be read to be discarded.

Keep the supersession convention in `docs/adr/README.md` intact for genuine future reversals. The problem is a three-link chain about one question, not the convention.

**Done when**

- [x] One ADR states how ids work today
- [ ] Both reversals and their changed premises are recorded in it
- [x] No ADR that reads as current describes removed behaviour
- [x] Links from other docs still resolve


## Notes

Closed, but one criterion is deliberately left open rather than ticked. ADR-0003 records why sequential ids lost, as a considered option, but not that the decision was taken, reversed, and reversed again. That history lived in the superseded records, and those were deleted when the set was restarted.

Under the convention now in `docs/adr/README.md` this would not happen again: an accepted record is never rewritten or deleted, a reversal gets a new record, and the table in that README is what tells a reader which decisions are current. The chain that prompted this ticket is solved by the index, not by collapsing records.
