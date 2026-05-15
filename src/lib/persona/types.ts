/**
 * Layer 4 — Persona + Behavioral Intelligence Engine
 * Shared types and contracts for derived intelligence (NOT raw memory).
 */

export type SourceLayer = "L1" | "L2" | "L2.5" | "L3" | "L4" | "L5";

export interface ToneAnalysis {
  directness: number;
  passiveLikelihood: number;
  urgency: number;
  formality: number;
}

export interface WritingStructure {
  avgSentenceLength: number;
  usesBullets: boolean;
  sentenceCount: number;
  paragraphCount: number;
  punctuationDensity: number;
}

export interface BehavioralMarkers {
  executionFocus: number;
  analyticalDepth: number;
  verbosity: number;
  abstractionPreference: number;
}

export interface ExtractedEvidence {
  tone: ToneAnalysis;
  pattern: unknown;
  writingStructure: WritingStructure;
  behavioralMarkers: BehavioralMarkers;
}

export interface StyleEnforcementInput {
  content: string;
  style?: {
    directness?: number;
    verbosity?: "short" | "medium" | "long";
    structure?: "bulleted" | "paragraph" | "hybrid";
  };
  confidence?: number;
}

export interface StyleEnforcementResult {
  content: string;
  applied: boolean;
  reason: string;
  changes: string[];
}

export interface FingerprintResult {
  aiProbability: number;
  humanProbability: number;
  verifiedHuman: boolean;
  styleVector: {
    length: number;
    punctuationDensity: number;
    avgWordLength: number;
  };
}

export interface EvolutionResult {
  field: string;
  nextConfidence: number;
  merged: Record<string, unknown>;
  delta: number;
}

export interface PersonaEvidenceInput {
  userId: string;
  outputText?: string;
  sourceLayer?: SourceLayer;
  sourceId?: string;
}

export interface FeedbackPayload {
  userId: string;
  targetType?: string;
  targetId?: string;
  feedbackType: "accepted" | "rejected" | "ignored";
  notes?: string;
}
