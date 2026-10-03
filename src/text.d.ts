// Markdown imported `with { type: "text" }` arrives as its contents, and Bun
// embeds it in the compiled binary.
declare module "*.md" {
  const text: string;
  export default text;
}
