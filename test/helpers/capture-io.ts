import { randomBytes } from "node:crypto";
import type { Io } from "../../src/run.ts";

export interface CapturedIo extends Io {
  out(): string;
  err(): string;
  asked(): { question: string; defaultValue: string }[];
  /** Every URL a command asked to open in a browser. */
  opened(): string[];
}

export interface CaptureOptions {
  /** Scripted answers. Omit entirely to make any prompt a test failure. */
  answers?: string[];
  /** Piped input. Omit entirely to make any stdin read a test failure. */
  stdin?: string;
  /** Fixed clock. Defaults to the real one. */
  now?: () => Date;
  /** Scripted randomness. Defaults to the real source. */
  randomHex?: (bytes: number) => string;
  /** The home directory. Defaults to the working directory, so nothing escapes the test. */
  home?: string;
  /** Whether to pretend stdout is a terminal. Defaults to false, as when piped. */
  isTty?: boolean;
  /** Where the installed binary lives, or null for moth running from source. */
  installedAt?: string | null;
  /** The newest published version. Defaults to unreachable, as when offline. */
  latestVersion?: () => Promise<string | null>;
  /**
   * Settles to end a long-running command. Defaults to never, so a test that
   * starts one must say when it stops.
   */
  untilInterrupted?: () => Promise<void>;
}

export function captureIo(cwd: string, options: CaptureOptions = {}): CapturedIo {
  let out = "";
  let err = "";
  const asked: { question: string; defaultValue: string }[] = [];
  let next = 0;
  const opened: string[] = [];

  return {
    cwd,
    installedAt:
      options.installedAt === undefined ? "/home/someone/.local/bin/moth" : options.installedAt,
    latestVersion: options.latestVersion ?? (async () => null),
    stdout: (text) => {
      out += text;
    },
    stderr: (text) => {
      err += text;
    },
    prompt: async (question, defaultValue) => {
      asked.push({ question, defaultValue });
      if (options.answers === undefined) {
        throw new Error(`unexpected prompt: ${question}`);
      }
      const answer = options.answers[next++];
      return answer === undefined || answer === "" ? defaultValue : answer;
    },
    stdin: async () => {
      if (options.stdin === undefined) {
        throw new Error("unexpected read of stdin");
      }
      return options.stdin;
    },
    now: options.now ?? (() => new Date()),
    randomHex: options.randomHex ?? ((bytes) => randomBytes(bytes).toString("hex")),
    openUrl: (url) => {
      opened.push(url);
    },
    untilInterrupted: options.untilInterrupted ?? (() => new Promise<void>(() => {})),
    home: options.home ?? cwd,
    isTty: options.isTty ?? false,
    out: () => out,
    err: () => err,
    asked: () => asked,
    opened: () => opened,
  };
}
