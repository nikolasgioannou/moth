import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./build.ts";

function run(args: string[], allowFailure = false): string {
  const result = Bun.spawnSync(args, { cwd: REPO_ROOT });
  if (result.exitCode !== 0 && !allowFailure) {
    throw new Error(`${args.join(" ")} failed:\n${result.stderr.toString()}`);
  }
  return result.stdout.toString().trim();
}

function fail(message: string): never {
  console.error(`release: ${message}`);
  process.exit(1);
}

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

/** Resolves "patch" | "minor" | "major" | an explicit version, against the current one. */
export function nextVersion(current: string, requested: string): string {
  if (SEMVER.test(requested)) return requested;
  const parts = SEMVER.exec(current);
  if (parts === null) fail(`the current version '${current}' is not semver`);
  const [major, minor, patch] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  if (requested === "major") return `${major + 1}.0.0`;
  if (requested === "minor") return `${major}.${minor + 1}.0`;
  if (requested === "patch") return `${major}.${minor}.${patch + 1}`;
  fail(`'${requested}' is not a version or one of major, minor, patch`);
}

/**
 * Cuts a release: checks the repository is in a fit state, bumps the version,
 * tags it, and pushes. Everything after the tag is CI's job.
 */
export function release(requested: string, dryRun: boolean): void {
  const packagePath = join(REPO_ROOT, "package.json");
  const manifest = JSON.parse(readFileSync(packagePath, "utf8")) as { version: string };
  const version = nextVersion(manifest.version, requested);
  const tag = `v${version}`;

  // Refuse to release from a state that would produce a release nobody can reproduce.
  if (run(["git", "status", "--porcelain"]) !== "") {
    fail("the working tree has uncommitted changes");
  }
  const branch = run(["git", "rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch !== "main") fail(`releases are cut from main, not ${branch}`);
  if (run(["git", "tag", "--list", tag]) !== "") fail(`${tag} already exists`);

  run(["git", "fetch", "--quiet", "origin", "main"]);
  const behind = run(["git", "rev-list", "--count", "HEAD..origin/main"]);
  if (behind !== "0") fail(`main is ${behind} commit(s) behind origin; pull first`);

  console.log(`release: ${manifest.version} -> ${version}`);

  // The version is bumped before the checks run, so anything that depends on it
  // is verified against the version being released rather than the previous one.
  const original = readFileSync(packagePath, "utf8");
  writeFileSync(packagePath, `${JSON.stringify({ ...manifest, version }, null, 2)}\n`);

  try {
    for (const check of [
      ["bun", "run", "lint"],
      ["bun", "run", "typecheck"],
      ["bun", "test"],
    ]) {
      console.log(`release: ${check.join(" ")}`);
      run(check);
    }
  } catch (error) {
    writeFileSync(packagePath, original);
    throw error;
  }

  if (dryRun) {
    writeFileSync(packagePath, original);
    console.log(`release: dry run, stopping before tagging ${tag}`);
    return;
  }

  run(["git", "add", "package.json"]);
  // The first release of a version already declared in package.json has nothing
  // to commit; tagging the existing commit is correct in that case.
  if (run(["git", "status", "--porcelain"]) !== "") {
    run(["git", "commit", "-m", `chore: release ${tag}`]);
  } else {
    console.log("release: package.json already declares this version, tagging as is");
  }
  // Annotated, so it carries a message and works where tags are signed.
  run(["git", "tag", "-a", "-m", `moth ${tag}`, tag]);
  run(["git", "push", "origin", "main"]);
  run(["git", "push", "origin", tag]);

  console.log(`release: pushed ${tag}. CI builds the binaries, publishes the release,`);
  console.log("release: bumps the Homebrew formula, and publishes to npm.");
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const requested = args.find((arg) => !arg.startsWith("--"));
  if (requested === undefined) {
    fail("usage: bun run release <version | major | minor | patch> [--dry-run]");
  }
  release(requested, dryRun);
}
