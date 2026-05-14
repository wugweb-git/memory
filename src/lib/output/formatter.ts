export function formatOutput(content: string, mode: "linkedin" | "medium" | "portfolio" | "note") {
  if (mode === "linkedin") return content.split("\n").map((l) => l.trim()).filter(Boolean).join("\n\n");
  if (mode === "medium") return content;
  if (mode === "portfolio") return `## Narrative\n\n${content}`;
  return content;
}
