import { chmodSync, copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pkg from "../package.json";
import { REPO_ROOT } from "./build.ts";
import { buildAllTargets, RELEASE_DIR } from "./release-build.ts";

const NPM_DIR = join(REPO_ROOT, "dist", "npm");
const WRAPPER = "moth-cli";

/** npm's platform names, which differ from ours for Windows. */
const PLATFORMS = [
  { asset: "moth-darwin-arm64", os: "darwin", cpu: "arm64", binary: "moth" },
  { asset: "moth-darwin-x64", os: "darwin", cpu: "x64", binary: "moth" },
  { asset: "moth-linux-arm64", os: "linux", cpu: "arm64", binary: "moth", libc: "glibc" },
  { asset: "moth-linux-x64", os: "linux", cpu: "x64", binary: "moth", libc: "glibc" },
  { asset: "moth-linux-arm64-musl", os: "linux", cpu: "arm64", binary: "moth", libc: "musl" },
  { asset: "moth-linux-x64-musl", os: "linux", cpu: "x64", binary: "moth", libc: "musl" },
  { asset: "moth-windows-x64.exe", os: "win32", cpu: "x64", binary: "moth.exe" },
] as const;

const packageName = (os: string, cpu: string, libc?: string) =>
  `${WRAPPER}-${os === "win32" ? "windows" : os}-${cpu}${libc === "musl" ? "-musl" : ""}`;

/**
 * The launcher npm installs as `moth`. It finds the binary for this platform and
 * runs it, so nobody pays for seven binaries. `os`, `cpu` and `libc` narrow what
 * a client fetches: npm 10.2+, pnpm and Yarn 4 honour all three and take exactly
 * one, while an older npm ignores `libc` and takes both Linux builds. That is
 * why the launcher resolves by libc at runtime rather than trusting the install
 * to have fetched only the right one.
 *
 * It costs ~30ms per invocation, almost all of it Node starting up, and a
 * `#!/bin/sh` shim using `exec` was measured at under 3ms. It stays Node anyway:
 * `bin` in package.json takes a single path with no per-platform form, and on
 * Windows npm generates a `.cmd` that invokes whatever the shebang names, so an
 * sh shim would be fast on POSIX and broken on Windows. Anyone who wants the
 * binary's real startup should install through Homebrew or the install script,
 * which the README now says.
 */
const SHIM = `#!/usr/bin/env node
"use strict";
const { spawnSync } = require("node:child_process");

const platform = process.platform === "win32" ? "windows" : process.platform;
// A glibc binary cannot load on a musl system at all, so the two Linux builds
// are separate packages. Node reports a glibc version only when it is running
// against glibc, which is how detect-libc tells them apart.
let libc = "";
if (process.platform === "linux") {
  try {
    libc = process.report.getReport().header.glibcVersionRuntime ? "" : "-musl";
  } catch {}
}
const name = "${WRAPPER}-" + platform + "-" + process.arch + libc;
const binary = process.platform === "win32" ? "moth.exe" : "moth";

let executable;
try {
  executable = require.resolve(name + "/" + binary);
} catch {
  console.error(
    "moth: no prebuilt binary for " + process.platform + "-" + process.arch + ".\\n" +
    "Install from https://github.com/nikolasgioannou/moth instead."
  );
  process.exit(1);
}

const result = spawnSync(executable, process.argv.slice(2), { stdio: "inherit" });
if (result.error) {
  console.error("moth: " + result.error.message);
  process.exit(1);
}
// 127 from the dynamic loader, not from moth. Alpine ships neither libstdc++
// nor libgcc, which the binary needs, and the loader's own message is opaque.
if (result.status === 127 && libc === "-musl") {
  console.error("moth: the binary could not load its shared libraries. Try: apk add libstdc++");
}
process.exit(result.status === null ? 1 : result.status);
`;

export function buildNpmPackages(version: string = pkg.version): string[] {
  buildAllTargets();
  rmSync(NPM_DIR, { recursive: true, force: true });

  const optional: Record<string, string> = {};
  const built: string[] = [];

  for (const platform of PLATFORMS) {
    const { asset, os, cpu, binary } = platform;
    const libc = "libc" in platform ? platform.libc : undefined;
    const name = packageName(os, cpu, libc);
    const dir = join(NPM_DIR, name);
    mkdirSync(dir, { recursive: true });
    copyFileSync(join(RELEASE_DIR, asset), join(dir, binary));
    chmodSync(join(dir, binary), 0o755);
    writeFileSync(
      join(dir, "package.json"),
      `${JSON.stringify(
        {
          name,
          version,
          description: `The moth binary for ${os} ${cpu}${libc === undefined ? "" : ` (${libc})`}.`,
          license: pkg.license,
          repository: { type: "git", url: "git+https://github.com/nikolasgioannou/moth.git" },
          os: [os],
          cpu: [cpu],
          // Honoured by npm 10.2+, pnpm and Yarn 4. Older clients ignore it and
          // can still install the wrong build, which is why the shim resolves
          // the package by libc at runtime rather than trusting the install.
          ...(libc === undefined ? {} : { libc: [libc] }),
          files: [binary],
        },
        null,
        2,
      )}\n`,
    );
    optional[name] = version;
    built.push(name);
  }

  const dir = join(NPM_DIR, WRAPPER);
  mkdirSync(join(dir, "bin"), { recursive: true });
  writeFileSync(join(dir, "bin", "moth.cjs"), SHIM);
  chmodSync(join(dir, "bin", "moth.cjs"), 0o755);
  copyFileSync(join(REPO_ROOT, "README.md"), join(dir, "README.md"));
  copyFileSync(join(REPO_ROOT, "LICENSE"), join(dir, "LICENSE"));
  writeFileSync(
    join(dir, "package.json"),
    `${JSON.stringify(
      {
        name: WRAPPER,
        version,
        description:
          "An opinionated issue tracker that lives in your repo. Tickets are markdown files with an enforced schema.",
        keywords: ["issue-tracker", "cli", "tickets", "markdown", "agents"],
        license: pkg.license,
        repository: { type: "git", url: "git+https://github.com/nikolasgioannou/moth.git" },
        homepage: "https://github.com/nikolasgioannou/moth",
        bin: { moth: "./bin/moth.cjs" },
        files: ["bin"],
        optionalDependencies: optional,
      },
      null,
      2,
    )}\n`,
  );
  built.push(WRAPPER);
  return built;
}

if (import.meta.main) {
  const version = process.argv[2] ?? pkg.version;
  for (const name of buildNpmPackages(version)) console.log(`packaged ${name}`);
}
