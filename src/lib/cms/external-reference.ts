export function mapExternalReference(input: { title: string; url: string; source?: string }) {
  return { ...input, source: input.source || "external", type: "externalReference" };
}
