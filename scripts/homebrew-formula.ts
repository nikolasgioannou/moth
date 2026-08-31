import { readFileSync } from "node:fs";
import { join } from "node:path";
import pkg from "../package.json";
import { RELEASE_DIR } from "./release-build.ts";

/**
 * Renders the Homebrew formula for a release. The checksums come from the
 * SHA256SUMS built alongside the binaries, so the formula cannot drift from
 * what was actually published.
 */
export function formula(version: string): string {
  const sums = new Map(
    readFileSync(join(RELEASE_DIR, "SHA256SUMS"), "utf8")
      .trim()
      .split("\n")
      .map((line) => {
        const [digest, asset] = line.trim().split(/\s+/);
        return [asset ?? "", digest ?? ""] as const;
      }),
  );

  // The version is interpolated by Homebrew, matching the other formulas in the
  // tap, so a bump only has to touch the version line and the four checksums.
  const url = (asset: string) =>
    "https://github.com/nikolasgioannou/moth/releases/download/v#{version}/" + asset;

  return `class Moth < Formula
  desc "Opinionated issue tracker that lives in your repo, as markdown files"
  homepage "https://github.com/nikolasgioannou/moth"
  version "${version}"
  license "${pkg.license}"

  on_macos do
    on_arm do
      url "${url("moth-darwin-arm64")}"
      sha256 "${sums.get("moth-darwin-arm64")}"
    end
    on_intel do
      url "${url("moth-darwin-x64")}"
      sha256 "${sums.get("moth-darwin-x64")}"
    end
  end

  on_linux do
    on_arm do
      url "${url("moth-linux-arm64")}"
      sha256 "${sums.get("moth-linux-arm64")}"
    end
    on_intel do
      url "${url("moth-linux-x64")}"
      sha256 "${sums.get("moth-linux-x64")}"
    end
  end

  def install
    bin.install Dir["moth-*"].first => "moth"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/moth --version")
  end
end
`;
}

if (import.meta.main) {
  console.log(formula(process.argv[2] ?? pkg.version));
}
