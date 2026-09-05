/** How moth got onto this machine, which decides who is allowed to replace it. */
export type Install = "homebrew" | "npm" | "standalone";

/**
 * Which installer owns the binary at `executable`.
 *
 * Guessing wrong is worse than not guessing: telling a Homebrew user to run an
 * npm command leaves them with two moths on their PATH and the wrong one
 * winning. Both package managers put the binary somewhere recognisable, so a
 * path that matches neither is treated as a bare install, which is the only case
 * moth is entitled to overwrite.
 */
export function installKind(executable: string): Install {
  const path = executable.replaceAll("\\", "/");
  if (path.includes("/Cellar/") || path.includes("/homebrew/")) return "homebrew";
  if (path.includes("/node_modules/")) return "npm";
  return "standalone";
}

/** The command that upgrades an install moth must not touch itself. */
export function upgradeCommand(kind: Install): string | null {
  if (kind === "homebrew") return "brew upgrade nikolasgioannou/tap/moth";
  if (kind === "npm") return "npm install -g moth-cli@latest";
  return null;
}

/** Compares two semver strings, ignoring any leading `v`. */
export function isNewer(candidate: string, current: string): boolean {
  const parts = (version: string) =>
    version
      .replace(/^v/, "")
      .split(".")
      .map((part) => Number.parseInt(part, 10));
  const [a, b] = [parts(candidate), parts(current)];
  for (let i = 0; i < 3; i++) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left !== right) return left > right;
  }
  return false;
}

/** The asset name for a platform, matching what a release publishes. */
export function assetFor(platform: string, arch: string, musl: boolean): string | null {
  const os = platform === "win32" ? "windows" : platform;
  if (os !== "darwin" && os !== "linux" && os !== "windows") return null;
  const cpu = arch === "arm64" ? "arm64" : arch === "x64" ? "x64" : null;
  if (cpu === null) return null;
  if (os === "windows") return cpu === "x64" ? "moth-windows-x64.exe" : null;
  return `moth-${os}-${cpu}${os === "linux" && musl ? "-musl" : ""}`;
}
