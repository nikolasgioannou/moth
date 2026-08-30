import pkg from "../package.json";

export interface Io {
  cwd: string;
  stdout(text: string): void;
  stderr(text: string): void;
}

export async function run(argv: string[], io: Io): Promise<number> {
  const command = argv[0];

  if (command === "--version") {
    io.stdout(`${pkg.version}\n`);
    return 0;
  }

  io.stderr(`moth: unknown command '${command}'\n`);
  return 2;
}
