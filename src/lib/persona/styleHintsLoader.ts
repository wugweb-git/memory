import { postgres } from '@/lib/db/postgres';
import { IDENTITY_CONFIG } from '@/config/identity';
import { buildStyleHints } from './styleHints';

/**
 * Loads L4 persona and returns a STYLE HINTS block, or '' on timeout/error/no persona.
 * Never throws; never waits longer than timeoutMs.
 */
export async function loadStyleHints(
  userId: string = IDENTITY_CONFIG.DEFAULT_USER_ID,
  timeoutMs = 800,
): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const work = (async () => {
      const [profile, traits] = await Promise.all([
        postgres.personaProfile.findUnique({ where: { userId } }),
        postgres.traitScore.findMany({ where: { userId } }),
      ]);
      return buildStyleHints({
        confidenceScore: profile?.confidenceScore,
        communicationStyle: profile?.communicationStyle,
        writingStyle: profile?.writingStyle,
        traits: traits.map((t) => ({ trait: t.trait, score: t.score, confidence: t.confidence })),
      });
    })();
    work.catch(() => {});
    const timeout = new Promise<string>((resolve) => {
      timer = setTimeout(() => resolve(''), timeoutMs);
    });
    return await Promise.race([work, timeout]);
  } catch {
    return '';
  } finally {
    if (timer) clearTimeout(timer);
  }
}
