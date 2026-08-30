import type { Io } from "../src/run.ts";

export interface CapturedIo extends Io {
  out(): string;
  err(): string;
  asked(): { question: string; defaultValue: string }[];
}

export interface CaptureOptions {
  /** Scripted answers. Omit entirely to make any prompt a test failure. */
  answers?: string[];
}

export function captureIo(cwd: string, options: CaptureOptions = {}): CapturedIo {
  let out = "";
  let err = "";
  const asked: { question: string; defaultValue: string }[] = [];
  let next = 0;

  return {
    cwd,
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
    out: () => out,
    err: () => err,
    asked: () => asked,
  };
}
