import { postgres } from "../db/postgres"

/**
 * Weekly decay function to ensure stale intelligence loses confidence over time.
 * This keeps the system realistic and adaptive to change.
 */
export async function runConfidenceDecay() {
  const ONE_WEEK_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const TWO_WEEKS_AGO = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  console.log("[Intelligence/Decay] Starting confidence decay run...")

  // 1. Decay stable behaviors (Slow decay 0.98)
  const behaviors = await postgres.$executeRaw`
    UPDATE behavior_models 
    SET confidence = confidence * 0.98 
    WHERE "updatedAt" < ${ONE_WEEK_AGO} AND confidence > 0.1
  `

  // 2. Decay trait scores (Medium decay 0.95)
  const traits = await postgres.$executeRaw`
    UPDATE trait_scores 
    SET confidence = confidence * 0.95 
    WHERE "updatedAt" < ${TWO_WEEKS_AGO} AND confidence > 0.1
  `

  // 3. Decay implicit preferences
  const prefs = await postgres.$executeRaw`
    UPDATE preferences 
    SET confidence = confidence * 0.9 
    WHERE explicit = false AND "updatedAt" < ${ONE_WEEK_AGO} AND confidence > 0.1
  `

  console.log(`[Intelligence/Decay] Decay complete. Updated ${behaviors} behaviors, ${traits} traits, ${prefs} preferences.`)
}
