import { postgres } from "../db/postgres"

export interface BehaviorUpsert {
  userId: string
  modelType: string
  key: string
  newValue: any
  newConfidence: number
  sourceId: string
}

export async function upsertBehavior(params: BehaviorUpsert) {
  const { userId, modelType, key, newValue, newConfidence, sourceId } = params

  const existing = await postgres.behaviorModel.findUnique({
    where: {
      userId_modelType_key: { userId, modelType, key }
    }
  })

  if (!existing) {
    return postgres.behaviorModel.create({
      data: {
        userId,
        modelType,
        key,
        value: newValue,
        confidence: newConfidence,
        sourceIds: [sourceId],
        occurrences: 1
      }
    })
  }

  // Weight Calculation:
  // We use current confidence as weight for the old value
  const weightOld = existing.confidence
  const weightNew = newConfidence
  const totalWeight = weightOld + weightNew

  let mergedValue = newValue

  if (typeof newValue === "number" && typeof existing.value === "number") {
    // Weighted average for numbers
    mergedValue = (Number(existing.value) * weightOld + Number(newValue) * weightNew) / totalWeight
  } else if (Array.isArray(newValue) && Array.isArray(existing.value)) {
    // Merge and dedup for arrays
    mergedValue = Array.from(new Set([...(existing.value as any[]), ...newValue]))
  } else if (typeof newValue === "object" && typeof existing.value === "object") {
    // Merge objects (last writer wins on collision for now)
    mergedValue = { ...(existing.value as object), ...(newValue as object) }
  }

  // Confidence Growth Logic:
  // confidence = min(1, (oldConf * occurrences + newConf) / (occurrences + 1))
  const mergedConfidence = Math.min(
    1.0,
    (existing.confidence * existing.occurrences + newConfidence) / (existing.occurrences + 1)
  )

  return postgres.behaviorModel.update({
    where: { id: existing.id },
    data: {
      value: mergedValue,
      confidence: mergedConfidence,
      occurrences: existing.occurrences + 1,
      sourceIds: {
        push: sourceId
      },
      updatedAt: new Date()
    }
  })
}
