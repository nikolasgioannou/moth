import type { Io } from "../src/run.ts";

export interface CapturedIo extends Io {
  out(): string;
  err(): string;
}

export function captureIo(cwd = process.cwd()): CapturedIo {
  let out = "";
  let err = "";
  return {
    cwd,
    stdout: (text) => { out += text; },
    stderr: (text) => { err += text; },
    out: () => out,
    err: () => err,
  };
}
