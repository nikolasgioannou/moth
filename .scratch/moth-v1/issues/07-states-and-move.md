# 07: Workflow states and moth move

**What to build:** A ticket moves through the states this repo defined at init, with moth refusing states it does not recognise and telling the caller what it would accept instead.

**Blocked by:** 03 (moth init), 06 (ID resolution)

**Status:** ready-for-agent

- [ ] Moving a ticket to a state defined in config succeeds and updates the file
- [ ] Moving to an undefined state fails and lists the legal states in the error
- [ ] Every state resolves to exactly one of the five fixed categories
- [ ] Moving a ticket to the state it already occupies exits 0 and is not treated as an error
- [ ] The updated ticket is printed on success
- [ ] The updated timestamp changes and the created timestamp does not
