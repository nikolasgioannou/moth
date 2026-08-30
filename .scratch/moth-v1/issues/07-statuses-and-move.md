# 07: Workflow statuses and moth move

**What to build:** A ticket moves through the statuses this repo defined at init, with moth refusing statuses it does not recognise and telling the caller what it would accept instead.

**Blocked by:** 03 (moth init), 06 (ID resolution)

**Status:** ready-for-agent

- [x] Moving a ticket to a status defined in config succeeds and updates the file
- [x] Moving to an undefined status fails and lists the legal statuses in the error
- [x] Every status resolves to exactly one of the six fixed categories
- [x] Moving a ticket to the status it already occupies exits 0 and is not treated as an error
- [x] The updated ticket is printed on success
- [x] The updated timestamp changes and the created timestamp does not
