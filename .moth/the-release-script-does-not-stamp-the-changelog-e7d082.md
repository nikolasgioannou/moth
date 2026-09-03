---
id: "e7d082"
title: The release script does not stamp the changelog
status: done
priority: medium
labels:
  - cli
  - release
created_at: 2026-09-02T18:33:21.648Z
updated_at: 2026-09-03T00:24:02.228Z
---

Release notes are read from the `## [X.Y.Z]` section of `CHANGELOG.md`, but work accumulates under `## [Unreleased]`. Nothing renames it, so `bun run release patch` tags a version the changelog has no section for, the workflow falls back to generated notes, and the release succeeds looking fine. This happened on 0.3.1 and was only avoided by stamping the section by hand first.

The failure is silent and degrades the artifact users actually read, which is the worst combination: no error, worse output, discovered later or never.

**What to build**

`scripts/release.ts` already knows the version and already rewrites `package.json`. Have it do the same for the changelog, in the same place, before the checks run:

- Rename `## [Unreleased]` to `## [<version>] - <date>`
- Insert a fresh empty `## [Unreleased]` above it
- Add the `[<version>]: .../compare/v<previous>...v<version>` link and repoint the `[Unreleased]` link at the new version
- Restore the file alongside `package.json` if the checks fail, as that path already does

**A design question to settle first**

Should the workflow still fall back to generated notes when a section is missing? The fallback was written so a forgotten entry could never break a release. But once the script stamps the section automatically, a missing section means something is actually wrong, and silence stops being the kind choice. Consider failing loudly instead, or warning in the job summary.

**Edge cases**

- An empty `Unreleased` section: releasing nothing user-visible is legitimate (a dependency bump), so this should not be an error, but the notes should not be blank either.
- Re-releasing a version already declared in `package.json`, which the script supports for a retried release: it must not stamp twice or duplicate the link.
- The previous version for the compare link comes from the last tag, not from `package.json`, which has already been bumped.

**Done when**

- [x] `bun run release <version>` stamps the changelog with no manual step
- [x] A fresh empty `Unreleased` section is left behind
- [x] Compare links are correct, and restamping an already-stamped version is a no-op
- [x] A failed check, and a dry run, restore the changelog as well as package.json
- [x] The decision on the workflow fallback is made and recorded


## Notes

`stampChangelog` is a pure function taking the changelog, the version, the previous version and the date, so the awkward cases are tested without touching a repository: an already-stamped version, an empty Unreleased section, and a changelog with no Unreleased heading at all. Seven tests, and `nextVersion` gained coverage alongside it, having been exported and untested since it was written.

**The fallback decision: keep it, but stop being silent.** Failing the release would turn a cosmetic problem into a broken publish, and the binaries and npm packages are fine either way. Since the script now stamps automatically, a missing section does mean something is wrong, so the workflow writes to the job summary and emits `::warning::`, which surfaces on the run page rather than only in a log nobody opens.
