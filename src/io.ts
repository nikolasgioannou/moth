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
  /**
   * The installed binary being run, or null when moth is running from source.
   * Null matters: from source this would be the Bun executable, and an upgrade
   * would replace Bun rather than moth.
   */
  installedAt: string | null;
  /** The newest published version, or null when it cannot be reached. */
  latestVersion(): Promise<string | null>;
}
