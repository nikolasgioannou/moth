# 08: Schema introspection and declared custom fields

**What to build:** An agent with no memory of previous sessions asks moth what is legal in this repo and gets a complete answer, and any attempt to introduce a field nobody declared is refused. This is moth's core guarantee.

**Blocked by:** 07 (statuses and move)

**Status:** ready-for-agent

- [ ] Querying the schema returns every legal field, every status with its category, and every priority value
- [ ] A custom field declared in config is accepted on a ticket
- [ ] A field not declared in config is rejected on write, and the error names the offending key
- [ ] A hand-edited ticket file containing an undeclared key is reported when read, not silently accepted
- [ ] A ticket whose status is absent from config is reported when read
- [ ] The schema output is machine-readable and sufficient to construct a valid ticket without reading config by hand
