/** Everything non-deterministic about the outside world, injected so tests can drive it. */
export interface Io {
  cwd: string;
  stdout(text: string): void;
  stderr(text: string): void;
  prompt(question: string, defaultValue: string): Promise<string>;
  stdin(): Promise<string>;
  now(): Date;
  randomHex(bytes: number): string;
  /** Whether stdout is a terminal, so output can drop colour when piped. */
  isTty: boolean;
  /** The binary being run, which is how moth tells brew from npm from a bare install. */
  executable: string;
  /** The newest published version, or null when it cannot be reached. */
  latestVersion(): Promise<string | null>;
}
