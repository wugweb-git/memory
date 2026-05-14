export function detectFatigue(eventsLast24h: number) {
  return { fatigued: eventsLast24h > 25, load: eventsLast24h };
}
