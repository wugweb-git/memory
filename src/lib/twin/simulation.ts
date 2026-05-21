/**
 * Digital Twin — Behavioral Simulation
 * Generates a simulation score from user traits.
 */

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

export interface SimulationInput {
  executionFocus: number;
  analyticalDepth: number;
  verbosity: number;
  abstractionPreference: number;
  confidence: number;
}

export interface SimulationResult {
  score: number;
  confidence: number;
  behaviorProfile: string;
}

export function simulateBehavior(traits: SimulationInput): SimulationResult {
  const score = clamp(
    traits.executionFocus * 0.35 +
    traits.analyticalDepth * 0.25 +
    (1 - traits.verbosity) * 0.15 +
    traits.abstractionPreference * 0.15 +
    traits.confidence * 0.1
  );

  const confidence = clamp(traits.confidence * 0.8 + 0.2);

  const profile = score > 0.7 ? "decisive_executor"
    : score > 0.5 ? "analytical_operator"
    : score > 0.3 ? "systematic_planner"
    : "exploratory_thinker";

  return { score, confidence, behaviorProfile: profile };
}