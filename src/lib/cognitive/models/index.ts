export function modelFallbackChain(primary: string) {
  const chain = [primary, "gpt", "claude", "gemini"].filter((v, i, a) => a.indexOf(v) === i);
  return chain;
}
