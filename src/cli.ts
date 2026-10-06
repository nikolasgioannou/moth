import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { run } from "./run.ts";
import { runningFromSource } from "./upgrade.ts";

const code = await run(process.argv.slice(2), {
  cwd: process.cwd(),
  stdout: (text) => {
    process.stdout.write(text);
  },
  stderr: (text) => {
    process.stderr.write(text);
  },
  prompt: async (question, defaultValue) => prompt(question, defaultValue) ?? defaultValue,
  stdin: async () => await Bun.stdin.text(),
  now: () => new Date(),
  randomHex: (bytes) => randomBytes(bytes).toString("hex"),
  home: homedir(),
  isTty: process.stdout.isTTY === true,
  installedAt: runningFromSource(Bun.main) ? null : process.execPath,
  // Only ever called by `moth upgrade`. moth makes no network request otherwise,
  // and does not check for updates in the background: a tool that starts in 12ms
  // should not spend 200ms phoning home before doing what it was asked.
  latestVersion: async () => {
    try {
      const response = await fetch(
        "https://api.github.com/repos/nikolasgioannou/moth/releases/latest",
        { headers: { accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(10_000) },
      );
      if (!response.ok) return null;
      const release = (await response.json()) as { tag_name?: string };
      return release.tag_name?.replace(/^v/, "") ?? null;
    } catch {
      return null;
    }
  },
  openUrl: (url) => {
    const command =
      process.platform === "darwin"
        ? ["open", url]
        : process.platform === "win32"
          ? ["cmd", "/c", "start", "", url]
          : ["xdg-open", url];
    // Best effort: with no browser to open, the printed URL is still there to click.
    try {
      Bun.spawn(command, { stdout: "ignore", stderr: "ignore" }).unref();
    } catch {}
  },
  untilInterrupted: () =>
    new Promise((resolve) => {
      process.once("SIGINT", () => resolve());
      process.once("SIGTERM", () => resolve());
    }),
});

process.exit(code);
