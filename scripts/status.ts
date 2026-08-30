import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dir, "..", ".scratch", "moth-v1", "issues");
const tickets = readdirSync(dir)
  .filter((name) => name.endsWith(".md"))
  .sort()
  .map((name) => {
    const text = readFileSync(join(dir, name), "utf8");
    const criteria = text.match(/^- \[.\]/gm) ?? [];
    const open = criteria.filter((line) => line === "- [ ]").length;
    const blockers =
      (/^\*\*Blocked by:\*\* (.*)$/m.exec(text)?.[1] ?? "").match(/\b\d{2}\b/g) ?? [];
    return { number: name.slice(0, 2), name, open, blockers };
  });

const doneOf = new Map(tickets.map((t) => [t.number, t.open === 0]));
for (const t of tickets) {
  if (t.open === 0) continue;
  const waiting = t.blockers.filter((b) => doneOf.get(b) === false);
  const label = waiting.length === 0 ? "READY  " : `blocked on ${waiting.join(", ")}`;
  console.log(`  ${label.padEnd(18)} ${t.name.replace(".md", "")}  (${t.open} open)`);
}
console.log(`\n  ${tickets.filter((t) => t.open === 0).length}/${tickets.length} tickets complete`);
