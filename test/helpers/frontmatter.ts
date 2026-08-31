/**
 * A frontmatter reader for tests only, deliberately independent of the
 * production writer so a bug in one cannot hide behind the other.
 */
export function parseFrontmatter(raw: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  const yaml = match?.[1];
  const body = match?.[2];
  if (yaml === undefined || body === undefined) {
    throw new Error(`no frontmatter found in:\n${raw}`);
  }
  // Drop the conventional blank line that follows the closing delimiter.
  return { data: Bun.YAML.parse(yaml) as Record<string, unknown>, body: body.replace(/^\n/, "") };
}
