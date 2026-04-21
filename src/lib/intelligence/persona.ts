import { postgres } from "../db/postgres"

export interface PersonaUpdate {
  userId: string
  publicTraits?: string[]
  positioningKeywords?: string[]
  bioSummary?: string
}

/**
 * Updates the public-facing persona profile.
 * This is the "explicit" identity the user presents.
 */
export async function updatePersona(params: PersonaUpdate) {
  const { userId, publicTraits, positioningKeywords, bioSummary } = params

  return postgres.personaProfile.upsert({
    where: { userId },
    update: {
      ...(publicTraits && { publicTraits }),
      ...(positioningKeywords && { positioningKeywords }),
      ...(bioSummary && { bioSummary }),
    },
    create: {
      userId,
      publicTraits: publicTraits || [],
      positioningKeywords: positioningKeywords || [],
      bioSummary: bioSummary || "No bio set.",
    },
  })
}

export interface StylePatternUpdate {
  userId: string
  pattern: string
  confidence: number
}

/**
 * Learns and tracks writing style signatures.
 */
export async function learnStylePattern(params: StylePatternUpdate) {
  const { userId, pattern, confidence } = params

  const existing = await postgres.stylePattern.findUnique({
    where: { userId_pattern: { userId, pattern } }
  })

  if (!existing) {
    return postgres.stylePattern.create({
      data: {
        userId,
        pattern,
        confidence,
        frequency: 1
      }
    })
  }

  return postgres.stylePattern.update({
    where: { id: existing.id },
    data: {
      frequency: existing.frequency + 1,
      confidence: Math.min(1.0, (existing.confidence * existing.frequency + confidence) / (existing.frequency + 1)),
      lastSeen: new Date()
    }
  })
}
