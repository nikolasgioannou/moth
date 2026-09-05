import { afterAll, expect, test } from "bun:test";

import { run } from "../src/run.ts";
import {
  assetFor,
  installKind,
  isNewer,
  runningFromSource,
  upgradeCommand,
} from "../src/upgrade.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { cleanupTempDirs, tempDir } from "./helpers/tmp.ts";

test("a Homebrew binary is recognised, wherever the prefix is", () => {
  expect(installKind("/opt/homebrew/Cellar/moth/0.4.0/bin/moth")).toBe("homebrew");
  expect(installKind("/usr/local/Cellar/moth/0.4.0/bin/moth")).toBe("homebrew");
  expect(installKind("/home/linuxbrew/.linuxbrew/Cellar/moth/0.4.0/bin/moth")).toBe("homebrew");
});

test("an npm binary is recognised, global or local", () => {
  expect(installKind("/usr/local/lib/node_modules/moth-cli-darwin-arm64/moth")).toBe("npm");
  expect(installKind("/work/project/node_modules/moth-cli-linux-x64/moth")).toBe("npm");
});

test("anything else is a bare install, the only kind moth may overwrite", () => {
  expect(installKind("/home/someone/.local/bin/moth")).toBe("standalone");
  expect(installKind("/usr/local/bin/moth")).toBe("standalone");
});

test("a Windows path is read the same way, despite the separators", () => {
  expect(
    installKind("C:\\Users\\me\\AppData\\npm\\node_modules\\moth-cli-windows-x64\\moth.exe"),
  ).toBe("npm");
});

test("moth refuses to upgrade what a package manager owns, and names the command", () => {
  expect(upgradeCommand("homebrew")).toBe("brew upgrade nikolasgioannou/tap/moth");
  expect(upgradeCommand("npm")).toBe("npm install -g moth-cli@latest");
  expect(upgradeCommand("standalone")).toBeNull();
});

test("versions compare by number, not by string", () => {
  expect(isNewer("0.10.0", "0.9.0")).toBe(true); // string comparison gets this wrong
  expect(isNewer("0.4.1", "0.4.0")).toBe(true);
  expect(isNewer("1.0.0", "0.9.9")).toBe(true);
  expect(isNewer("v0.5.0", "0.4.0")).toBe(true);
  expect(isNewer("0.4.0", "0.4.0")).toBe(false);
  expect(isNewer("0.3.9", "0.4.0")).toBe(false);
});

test("the asset name matches what a release actually publishes", () => {
  expect(assetFor("darwin", "arm64", false)).toBe("moth-darwin-arm64");
  expect(assetFor("linux", "x64", false)).toBe("moth-linux-x64");
  expect(assetFor("linux", "x64", true)).toBe("moth-linux-x64-musl");
  expect(assetFor("linux", "arm64", true)).toBe("moth-linux-arm64-musl");
  expect(assetFor("win32", "x64", false)).toBe("moth-windows-x64.exe");
  // musl is a Linux concept; it must not leak into a macOS asset name
  expect(assetFor("darwin", "arm64", true)).toBe("moth-darwin-arm64");
});

test("a platform with no published binary is refused rather than guessed", () => {
  expect(assetFor("freebsd", "x64", false)).toBeNull();
  expect(assetFor("linux", "riscv64", false)).toBeNull();
  expect(assetFor("win32", "arm64", false)).toBeNull();
});

afterAll(cleanupTempDirs);

const io = (installedAt: string, latest: string | null) =>
  captureIo(tempDir(), { installedAt, latestVersion: async () => latest });

test("an install owned by Homebrew is never overwritten; the brew command is printed", async () => {
  const captured = io("/opt/homebrew/Cellar/moth/0.4.0/bin/moth", "99.0.0");

  const code = await run(["upgrade"], captured);

  expect(code).toBe(0);
  expect(captured.out()).toContain("brew upgrade nikolasgioannou/tap/moth");
  expect(captured.out()).not.toContain("downloading");
});

test("an install owned by npm is never overwritten either", async () => {
  const captured = io("/usr/local/lib/node_modules/moth-cli-darwin-arm64/moth", "99.0.0");

  const code = await run(["upgrade"], captured);

  expect(code).toBe(0);
  expect(captured.out()).toContain("npm install -g moth-cli@latest");
  expect(captured.out()).not.toContain("downloading");
});

test("being up to date is success, and says so", async () => {
  const captured = io("/home/me/.local/bin/moth", "0.0.1");

  const code = await run(["upgrade"], captured);

  expect(code).toBe(0);
  expect(captured.out()).toContain("latest version");
});

test("an unreachable releases API fails rather than pretending", async () => {
  const captured = io("/home/me/.local/bin/moth", null);

  const code = await run(["upgrade"], captured);

  expect(code).toBe(1);
  expect(captured.err()).toContain("could not reach");
});

test("--check never downloads, even for a bare install", async () => {
  const captured = io("/home/me/.local/bin/moth", "99.0.0");

  const code = await run(["upgrade", "--check"], captured);

  expect(code).toBe(0);
  expect(captured.out()).toContain("99.0.0");
  expect(captured.out()).not.toContain("downloading");
});

test("a bare install moth cannot write to fails before downloading", async () => {
  const captured = captureIo(tempDir(), {
    installedAt: "/definitely/not/a/real/path/moth",
    latestVersion: async () => "99.0.0",
  });

  const code = await run(["upgrade"], captured);

  expect(code).toBe(1);
  expect(captured.err()).toContain("cannot write to");
  expect(captured.out()).not.toContain("downloading");
});

test("running from source is recognised, so upgrade cannot overwrite Bun itself", () => {
  // From source, process.execPath is the Bun binary. Bun's default install is
  // ~/.bun/bin/bun, which matches no package manager and would read as a bare
  // moth install.
  expect(runningFromSource("/Users/me/workspace/moth/src/cli.ts")).toBe(true);
  expect(runningFromSource("/Users/me/workspace/moth/[eval]")).toBe(true);

  expect(runningFromSource("/$bunfs/root/cli.ts")).toBe(false);
  expect(runningFromSource("B:\\~BUN\\root\\cli.ts")).toBe(false);
});

test("upgrade refuses outright when moth is running from source", async () => {
  const captured = captureIo(tempDir(), {
    installedAt: null,
    latestVersion: async () => "99.0.0",
  });

  const code = await run(["upgrade"], captured);

  expect(code).toBe(1);
  expect(captured.err()).toContain("running from source");
  expect(captured.out()).not.toContain("downloading");
});
