import { postgres } from "../db/postgres"

export interface TraitUpdate {
  userId: string
  trait: string
  newScore: number
  newConfidence: number
  sourceId: string
}

export async function updateTrait(params: TraitUpdate) {
  const { userId, trait, newScore, newConfidence, sourceId } = params

  const existing = await postgres.traitScore.findUnique({
    where: {
      userId_trait: { userId, trait }
    }
  })

  if (!existing) {
    return postgres.traitScore.create({
      data: {
        userId,
        trait,
        score: newScore,
        confidence: newConfidence,
        sourceIds: [sourceId],
        occurrences: 1
      }
    })
  }

  // Weighted Score Update
  const mergedScore =
    (existing.score * existing.confidence + newScore * newConfidence) /
    (existing.confidence + newConfidence)

  // Confidence Growth
  const mergedConfidence = Math.min(
    1.0,
    (existing.confidence * existing.occurrences + newConfidence) / (existing.occurrences + 1)
  )

  return postgres.traitScore.update({
    where: { id: existing.id },
    data: {
      score: mergedScore,
      confidence: mergedConfidence,
      occurrences: existing.occurrences + 1,
      sourceIds: {
        push: sourceId
      },
      updatedAt: new Date()
    }
  })
}
