---
id: 8
title: Schema introspection and declared custom fields
status: done
priority: none
labels: []
created_at: 2026-08-30T23:31:01.053Z
updated_at: 2026-08-30T23:31:01.862Z
blocked_by:
  - 7
---

**What to build:** An agent with no memory of previous sessions asks moth what is legal in this repo and gets a complete answer, and any attempt to introduce a field nobody declared is refused. This is moth's core guarantee.

**Note:** config is written by `moth init` only and hand-edited thereafter (decided during ticket 03), so declaring a custom field is an editor action, not a moth command. The generated config carries explanatory comments that a programmatic rewrite would destroy.

- [x] Querying the schema returns every legal field, every status with its category, and every priority value
- [x] A custom field declared in config is accepted on a ticket
- [x] A field not declared in config is rejected on write, and the error names the offending key
- [x] A hand-edited ticket file containing an undeclared key is reported when read, not silently accepted
- [x] A ticket whose status is absent from config is reported when read
- [x] The schema output is machine-readable and sufficient to construct a valid ticket without reading config by hand
