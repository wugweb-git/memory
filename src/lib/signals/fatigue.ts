export function detectSignalFatigue(eventsPerDay: number) {
  return { fatigued: eventsPerDay > 30, score: Math.min(1, eventsPerDay / 60) };
}
