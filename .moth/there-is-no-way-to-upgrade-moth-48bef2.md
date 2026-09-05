---
id: "48bef2"
title: There is no way to upgrade moth
status: done
priority: high
labels:
  - distribution
created_at: 2026-09-05T04:12:06.784Z
updated_at: 2026-09-05T04:12:21.691Z
---

Installing moth is easy and updating it is not: you have to remember which of three ways you used. `brew upgrade`, `npm install -g moth-cli@latest`, or re-running the install script.

**What the research says**

Two findings shaped this, and one of them ruled out the obvious feature.

*Never upgrade what a package manager owns.* Overwriting a Homebrew-installed binary leaves brew convinced it still has the old version, and the next `brew upgrade` silently reverts it. Mixed installs are the standard failure here — the Gemini CLI has an open issue where a user installed via npm, then Homebrew, and the tool told them to run `brew upgrade`, which did nothing because npm owned the binary. So moth detects who owns the install and upgrades only what nobody else does.

*Automatic updating is not what CLI users want.* The author of `update-notifier` set out to bring the browser update model to the terminal, tried automatic updating, and found it unpopular; the ecosystem settled on notify-or-explicit instead. Automatic updates also break reproducibility: a CI run that silently changes tool version is a CI run that cannot be trusted.

For moth there is a second reason, sharper than the first. ADR-0002 chose Bun over a native binary on a startup budget measured in milliseconds, and rejected Node because ~53ms of startup "actually disqualifies it". A background version check costs hundreds of milliseconds. Adding one would spend the entire budget that decision was made to protect.

**What to build**

`moth upgrade`, contacting the network only when run.

- Homebrew or npm install: print that installer`s command, change nothing
- Bare install: download the right asset and replace the binary in place
- `--check`: report what is available and stop
- Windows: print the releases URL, since a running program cannot replace itself there

**Done when**

- [x] `moth upgrade` reports the latest version and whether one is newer
- [x] A Homebrew or npm install is never overwritten
- [x] A bare install is replaced atomically, and a failed download leaves the old binary working
- [x] It fails before downloading when the target cannot be written
- [x] No network request is made by any other command
- [x] Verified by actually upgrading a real binary, on macOS and Linux


## Notes

Verified by upgrading a real binary from 0.3.0 to the published 0.4.0, on macOS and in a Debian container — the second because replacing the file a running process was started from is the part that differs between systems. Both left a working binary and no staging file behind.

The download is staged beside the target rather than in a temp directory: rename is only atomic within a filesystem, and atomic is what keeps a failed download from leaving half a moth on the PATH. Writability is checked before the 60MB download rather than after.

The decision logic is pure and tested — install detection, version comparison, asset naming — while the download and replacement are covered by hand. `installKind` is tested against real Homebrew, npm and Linuxbrew paths, and against a Windows path, since separators differ and a wrong answer sends someone the wrong upgrade command.

`isNewer` compares numerically. String comparison would call 0.9.0 newer than 0.10.0, which is a bug that only appears once, months in.
