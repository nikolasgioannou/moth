import { chmodSync, copyFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import pkg from "../../package.json";
import { parseArgs } from "../args.ts";
import type { Io } from "../io.ts";
import { assetFor, installKind, isNewer, upgradeCommand } from "../upgrade.ts";

const RELEASES = "https://github.com/nikolasgioannou/moth/releases";

/** Alpine and friends ship a different libc, and a different binary. */
function isMusl(): boolean {
  if (process.platform !== "linux") return false;
  try {
    const report = process.report?.getReport() as { header?: { glibcVersionRuntime?: string } };
    return !report?.header?.glibcVersionRuntime;
  } catch {
    return false;
  }
}

export async function upgrade(argv: string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv.slice(1), { check: { type: "boolean" } });
  if (!parsed.ok) {
    io.stderr(`moth: ${parsed.message}\n`);
    return 2;
  }

  const current = pkg.version;
  const latest = await io.latestVersion();
  if (latest === null) {
    io.stderr("moth: could not reach the releases API to find the latest version\n");
    return 1;
  }

  if (!isNewer(latest, current)) {
    io.stdout(`moth ${current} is the latest version\n`);
    return 0;
  }

  const kind = installKind(io.executable);
  io.stdout(`moth ${latest} is available, you have ${current}\n`);

  // Whoever installed moth owns it. Upgrading a Homebrew install by overwriting
  // the binary leaves brew convinced it still has the old one, and the next
  // `brew upgrade` silently reverts it.
  const command = upgradeCommand(kind);
  if (command !== null) {
    io.stdout(`moth was installed with ${kind}, so upgrade it the same way:\n\n  ${command}\n`);
    return 0;
  }

  if (parsed.values.check === true) {
    io.stdout(`run 'moth upgrade' to replace ${io.executable}\n`);
    return 0;
  }

  if (process.platform === "win32") {
    io.stdout(
      `Windows cannot replace a running program, so download it yourself:\n\n  ${RELEASES}\n`,
    );
    return 0;
  }

  const asset = assetFor(process.platform, process.arch, isMusl());
  if (asset === null) {
    io.stderr(`moth: no published binary for ${process.platform}-${process.arch}\n`);
    return 1;
  }

  return await replaceBinary(io, latest, asset);
}

/**
 * Downloads the new binary beside the old one and renames it into place.
 *
 * Beside, not in a temp directory, because rename is only atomic within a
 * filesystem — and atomic is what stops a failed download leaving a half-written
 * moth on the PATH. On Unix, replacing the file a running process was started
 * from is allowed; the running process keeps the old inode until it exits.
 */
async function replaceBinary(io: Io, version: string, asset: string): Promise<number> {
  const target = io.executable;
  const staged = join(dirname(target), `.moth-upgrade-${version}`);

  try {
    statSync(target);
    // Fail before downloading 60MB if the file cannot be replaced anyway.
    copyFileSync(target, staged);
    rmSync(staged);
  } catch {
    io.stderr(
      `moth: cannot write to ${dirname(target)}; upgrade with the permissions that installed moth\n`,
    );
    return 1;
  }

  const url = `${RELEASES}/download/v${version}/${asset}`;
  io.stdout(`downloading ${asset}\n`);
  let bytes: ArrayBuffer;
  try {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) {
      io.stderr(`moth: ${url} returned ${response.status}\n`);
      return 1;
    }
    bytes = await response.arrayBuffer();
  } catch (error) {
    io.stderr(`moth: could not download ${url}: ${(error as Error).message}\n`);
    return 1;
  }

  try {
    writeFileSync(staged, new Uint8Array(bytes));
    chmodSync(staged, 0o755);
    renameSync(staged, target);
  } catch (error) {
    rmSync(staged, { force: true });
    io.stderr(`moth: could not replace ${target}: ${(error as Error).message}\n`);
    return 1;
  }

  io.stdout(`upgraded to ${version}\n`);
  return 0;
}
