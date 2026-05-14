export function fallbackChain(primary: string) {
  const chain = [primary, "gpt", "claude", "gemini"].filter((x, i, a) => a.indexOf(x) === i);
  return chain;
}
