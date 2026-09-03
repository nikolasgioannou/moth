import { expect, test } from "bun:test";
import { nextVersion, stampChangelog } from "../scripts/release.ts";

const CHANGELOG = `# Changelog

## [Unreleased]

### Added

- A thing.

## [0.3.1] - 2026-09-02

### Fixed

- An older thing.

[Unreleased]: https://github.com/nikolasgioannou/moth/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/nikolasgioannou/moth/compare/v0.3.0...v0.3.1
`;

test("nextVersion resolves the keywords and passes an explicit version through", () => {
  expect(nextVersion("0.3.1", "patch")).toBe("0.3.2");
  expect(nextVersion("0.3.1", "minor")).toBe("0.4.0");
  expect(nextVersion("0.3.1", "major")).toBe("1.0.0");
  expect(nextVersion("0.3.1", "9.9.9")).toBe("9.9.9");
});

test("stamping moves Unreleased into the version being released", () => {
  const out = stampChangelog(CHANGELOG, "0.4.0", "0.3.1", "2026-09-03");

  expect(out).toContain("## [0.4.0] - 2026-09-03");
  // the entry moved, rather than being copied
  expect(out.indexOf("- A thing.")).toBeGreaterThan(out.indexOf("## [0.4.0]"));
  expect(out.indexOf("- A thing.")).toBeLessThan(out.indexOf("## [0.3.1]"));
});

test("stamping leaves a fresh empty Unreleased section behind", () => {
  const out = stampChangelog(CHANGELOG, "0.4.0", "0.3.1", "2026-09-03");

  expect(out).toContain("## [Unreleased]");
  const between = out.slice(out.indexOf("## [Unreleased]"), out.indexOf("## [0.4.0]"));
  expect(between.replace("## [Unreleased]", "").trim()).toBe("");
});

test("stamping adds the compare link and repoints Unreleased at the new version", () => {
  const out = stampChangelog(CHANGELOG, "0.4.0", "0.3.1", "2026-09-03");

  expect(out).toContain("[0.4.0]: https://github.com/nikolasgioannou/moth/compare/v0.3.1...v0.4.0");
  expect(out).toContain(
    "[Unreleased]: https://github.com/nikolasgioannou/moth/compare/v0.4.0...HEAD",
  );
  expect(out).not.toContain("compare/v0.3.1...HEAD");
});

test("stamping a version already stamped changes nothing, so a retried release is safe", () => {
  const once = stampChangelog(CHANGELOG, "0.4.0", "0.3.1", "2026-09-03");

  expect(stampChangelog(once, "0.4.0", "0.3.1", "2026-09-03")).toBe(once);
});

test("an empty Unreleased section still stamps, since releasing nothing user-visible is legitimate", () => {
  const empty = CHANGELOG.replace("\n### Added\n\n- A thing.\n", "");

  const out = stampChangelog(empty, "0.4.0", "0.3.1", "2026-09-03");

  expect(out).toContain("## [0.4.0] - 2026-09-03");
  expect(out).toContain("## [Unreleased]");
});

test("a changelog with no Unreleased heading is left alone rather than mangled", () => {
  const none = "# Changelog\n\n## [0.3.1] - 2026-09-02\n\n- A thing.\n";

  expect(stampChangelog(none, "0.4.0", "0.3.1", "2026-09-03")).toBe(none);
});
