export function contextualAction(mode: "architect" | "founder" | "operator") {
  if (mode === "operator") return "execute-now";
  if (mode === "founder") return "prioritize-revenue";
  return "design-system";
}
