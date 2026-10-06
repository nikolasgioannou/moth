// A file imported `with { type: "text" }` arrives as its contents, and Bun
// embeds it in the compiled binary: the skill's markdown, and the stylesheet
// that `moth open` serves.
declare module "*.md" {
  const text: string;
  export default text;
}

declare module "*.css" {
  const text: string;
  export default text;
}
