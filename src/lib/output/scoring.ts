export function scoreOutputQuality(content: string) {
  const lengthScore = Math.min(1, content.length / 600);
  const structureScore = /\n/.test(content) ? 0.8 : 0.5;
  return { score: Number(((lengthScore + structureScore) / 2).toFixed(3)) };
}
