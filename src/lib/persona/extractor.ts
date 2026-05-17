/**
 * Layer 4 — Persona Extraction Engine
 * Analyzes outputs, memory, signals, and decisions to extract:
 * - tone
 * - communication patterns
 * - writing structure
 * - behavioral markers
 */

import { postgres } from "@/lib/db/postgres";
import type { Prisma } from "@/generated/postgres";
import type { PersonaEvidenceInput, ExtractedEvidence, ToneAnalysis, WritingStructure, BehavioralMarkers } from "./types";

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

function analyzeTone(text: string): ToneAnalysis {
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const directness =
    (wordCount > 0 ? (lower.match(/\b(must|do|ship|now|next|execute|build|launch|deploy|cut|drop)\b/g) || []).length / Math.max(1, wordCount * 0.02) : 0) +
    (text.match(/[!]/g) || []).length * 0.05;

  const passiveLikelihood =
    (text.match(/\b(was|were|is|are|been|being)\s+\w+ed\b/gi) || []).length / Math.max(1, wordCount * 0.05);

  const urgency =
    (lower.match(/\b(urgent|asap|immediately|deadline|now|today|tomorrow)\b/g) || []).length / Math.max(1, wordCount * 0.02);

  const formality =
    (lower.match(/\b(regarding|furthermore|hereby|pursuant|notwithstanding)\b/g) || []).length / Math.max(1, wordCount * 0.01);

  return {
    directness: clamp(directness),
    passiveLikelihood: clamp(passiveLikelihood),
    urgency: clamp(urgency),
    formality: clamp(formality),
  };
}

function analyzeWritingStructure(text: string): WritingStructure {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  return {
    avgSentenceLength: sentences.length ? wordCount / sentences.length : 0,
    usesBullets: /(^|\n)\s*[-*\d]+[.)]?\s+/m.test(text),
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    punctuationDensity: text.length > 0 ? (text.match(/[,:;.!?]/g) || []).length / text.length : 0,
  };
}

function analyzeBehavioralMarkers(text: string, structure: WritingStructure): BehavioralMarkers {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const abstractionWords = (text.toLowerCase().match(/\b(system|framework|architecture|strategy|model|pattern|abstraction|concept|paradigm)\b/g) || []).length;

  return {
    executionFocus: structure.usesBullets ? clamp(0.5 + structure.sentenceCount * 0.02) : clamp(0.5 - structure.sentenceCount * 0.01),
    analyticalDepth: structure.avgSentenceLength > 90 ? clamp(0.7) : clamp(0.5),
    verbosity: wordCount > 300 ? clamp(0.7 + (wordCount - 300) / 1000) : clamp(0.5 - (300 - wordCount) / 600),
    abstractionPreference: clamp(abstractionWords / Math.max(1, wordCount * 0.02)),
  };
}

export async function extractPersonaEvidence(input: PersonaEvidenceInput): Promise<ExtractedEvidence> {
  const text = (input.outputText || "").trim();
  const tone = analyzeTone(text);
  const writingStructure = analyzeWritingStructure(text);
  const behavioralMarkers = analyzeBehavioralMarkers(text, writingStructure);

  const pattern = await postgres.communicationPattern.create({
    data: {
      userId: input.userId,
      patternType: "structure",
      patternValue: writingStructure as unknown as any,
      confidence: clamp(0.55 + behavioralMarkers.executionFocus * 0.2),
      sampleCount: 1,
    },
  });

  // Extract additional communication patterns
  if (tone.directness > 0.6) {
    await postgres.communicationPattern.create({
      data: {
        userId: input.userId,
        patternType: "tone",
        patternValue: { directness: tone.directness, formality: tone.formality } as any,
        confidence: clamp(tone.directness * 0.9),
        sampleCount: 1,
      },
    });
  }

  if (behavioralMarkers.abstractionPreference > 0.5) {
    await postgres.communicationPattern.create({
      data: {
        userId: input.userId,
        patternType: "abstraction",
        patternValue: { level: behavioralMarkers.abstractionPreference } as any,
        confidence: clamp(behavioralMarkers.abstractionPreference * 0.85),
        sampleCount: 1,
      },
    });
  }

  return {
    tone,
    pattern,
    writingStructure,
    behavioralMarkers,
  };
}
