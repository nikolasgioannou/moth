/** Everything non-deterministic about the outside world, injected so tests can drive it. */
export interface Io {
  cwd: string;
  stdout(text: string): void;
  stderr(text: string): void;
  prompt(question: string, defaultValue: string): Promise<string>;
  stdin(): Promise<string>;
  now(): Date;
  randomHex(bytes: number): string;
}
