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
  { asset: "moth-linux-arm64", os: "linux", cpu: "arm64", binary: "moth" },
  { asset: "moth-linux-x64", os: "linux", cpu: "x64", binary: "moth" },
  { asset: "moth-windows-x64.exe", os: "win32", cpu: "x64", binary: "moth.exe" },
] as const;

const packageName = (os: string, cpu: string) =>
  `${WRAPPER}-${os === "win32" ? "windows" : os}-${cpu}`;

const SHIM = `#!/usr/bin/env node
"use strict";
// Finds the binary npm installed for this platform and runs it. Only the
// matching platform package is downloaded, so nobody pays for five binaries.
const { spawnSync } = require("node:child_process");

const platform = process.platform === "win32" ? "windows" : process.platform;
const name = "${WRAPPER}-" + platform + "-" + process.arch;
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
process.exit(result.status === null ? 1 : result.status);
`;

export function buildNpmPackages(version: string = pkg.version): string[] {
  buildAllTargets();
  rmSync(NPM_DIR, { recursive: true, force: true });

  const optional: Record<string, string> = {};
  const built: string[] = [];

  for (const { asset, os, cpu, binary } of PLATFORMS) {
    const name = packageName(os, cpu);
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
          description: `The moth binary for ${os} ${cpu}.`,
          license: pkg.license,
          repository: { type: "git", url: "git+https://github.com/nikolasgioannou/moth.git" },
          os: [os],
          cpu: [cpu],
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
