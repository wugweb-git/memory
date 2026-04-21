import { postgres } from "../db/postgres"

export interface PreferenceUpsert {
  userId: string
  category: string
  key: string
  value: any
  explicit: boolean
  confidence: number
  sourceId: string
}

export async function upsertPreference(params: PreferenceUpsert) {
  const { userId, category, key, value, explicit, confidence, sourceId } = params

  const existing = await postgres.preference.findUnique({
    where: {
      userId_category_key: { userId, category, key }
    }
  })

  // Explicit overrides always win
  if (explicit) {
    if (existing) {
      return postgres.preference.update({
        where: { id: existing.id },
        data: {
          value,
          explicit: true,
          confidence: 1.0,
          sourceIds: { push: sourceId },
          updatedAt: new Date()
        }
      })
    } else {
      return postgres.preference.create({
        data: {
          userId,
          category,
          key,
          value,
          explicit: true,
          confidence: 1.0,
          sourceIds: [sourceId]
        }
      })
    }
  }

  // Implicit Logic:
  if (!existing) {
    return postgres.preference.create({
      data: {
        userId,
        category,
        key,
        value,
        explicit: false,
        confidence,
        sourceIds: [sourceId]
      }
    })
  }

  // If existing is explicit, don't let implicit signals overwrite it
  if (existing.explicit) {
    return existing
  }

  // Only update if new signal is at least as confident or if we're merging patterns
  if (confidence < existing.confidence * 0.8) {
    return existing // Ignore weak signals
  }

  // For implicit preferences, we treat it like a behavior merge but slightly more biased towards recency
  return postgres.preference.update({
    where: { id: existing.id },
    data: {
      value, // In preferences, we usually take the latest inferred stable value
      confidence: Math.min(1.0, (existing.confidence * existing.occurrences + confidence) / (existing.occurrences + 1)),
      occurrences: existing.occurrences + 1,
      sourceIds: { push: sourceId },
      updatedAt: new Date()
    }
  })
}
