import { run } from "../src/run.ts";
import { captureIo } from "./io.ts";
import { tempDir } from "./tmp.ts";

export interface RepoOptions {
  /** Directory name for the temp repo. */
  name?: string;
}

/** A temp directory with moth initialised, accepting every default. */
export async function initedRepo(options: RepoOptions = {}): Promise<string> {
  const dir = tempDir(options.name);
  await run(["init"], captureIo(dir, { answers: [] }));
  return dir;
}
