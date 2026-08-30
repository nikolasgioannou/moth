import { randomBytes } from "node:crypto";
import { run } from "./run.ts";

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
  isTty: process.stdout.isTTY === true,
});

process.exit(code);
