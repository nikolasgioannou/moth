# 03: moth init

**What to build:** A developer turns any repo into a moth repo with one command, answering a couple of questions about how they want work labelled.

**Blocked by:** 01 (project scaffold)

**Status:** ready-for-agent

- [ ] Running init in a repo without moth creates the config file and the ticket directory
- [ ] Init asks for the ID prefix and offers a default derived from the repo name
- [ ] Init asks for workflow state names, each mapped to one of the five fixed categories, and offers a sensible default set
- [ ] Running init where moth already exists does not destroy existing configuration
- [ ] Init is the only command that prompts; every other command fails with a clear message rather than prompting when information is missing
