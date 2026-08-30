import { run } from "../src/run.ts";
import { captureIo } from "./io.ts";
import { tempDir } from "./tmp.ts";

export interface RepoOptions {
  /** Directory name, which init derives the default prefix from. */
  name?: string;
  /** Ticket prefix to answer init's first question with. */
  prefix?: string;
}

/** A temp directory with moth initialised, accepting defaults unless told otherwise. */
export async function initedRepo(options: RepoOptions = {}): Promise<string> {
  const dir = tempDir(options.name);
  const answers = options.prefix === undefined ? [] : [options.prefix];
  await run(["init"], captureIo(dir, { answers }));
  return dir;
}
