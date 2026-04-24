import { NextRequest, NextResponse } from 'next/server';
import { buildContext } from '@/lib/cognitive/contextBuilder';

export const dynamic = 'force-dynamic';

const EXPECTED_DOMAINS    = ['technical', 'leadership', 'product', 'communication', 'financial', 'creative'];
const EXPECTED_ENT_TYPES  = ['person', 'company', 'concept', 'tool'];

/**
 * POST /api/cognitive/gaps
 * -------------------------
 * L3 Gap Engine — Flow 3 from spec. Fully deterministic — no LLM.
 * Compares active context against expected professional profile completeness.
 * Strictly read-only — never mutates lower layers.
 *
 * Input contract:  { user_id: string }
 * Output contract: { coverage_score, missing_domains, weak_entities,
 *                    missing_entity_types, weak_signals, summary }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    // 1. Build bounded context (read-only)
    const context = await buildContext(user_id);

    // 2. Missing signal domains — compare active signal categories vs expected
    const activeCategories = [
      ...new Set(context.signals.map((s: any) => s.category?.toLowerCase()).filter(Boolean))
    ];
    const missingDomains = EXPECTED_DOMAINS.filter(
      d => !activeCategories.some(a => a.includes(d))
    );

    // 3. Weak entities — low occurrence count means underrepresented in memory
    const weakEntities = context.entities
      .filter((e: any) => (e.occurrences || 0) < 3)
      .map((e: any) => ({
        name:        e.name,
        type:        e.type,
        occurrences: e.occurrences || 0
      }))
      .slice(0, 8);

    // 4. Missing entity types — check expected types present in entity graph
    const activeTypes        = [...new Set(context.entities.map((e: any) => e.type).filter(Boolean))];
    const missingEntityTypes = EXPECTED_ENT_TYPES.filter(t => !activeTypes.includes(t));

    // 5. Low-intensity signals — signals that exist but carry weak signal strength
    const weakSignals = context.signals
      .filter((s: any) => (s.intensity_absolute || 0) < 0.3)
      .map((s: any) => ({
        type:      s.type,
        category:  s.category,
        intensity: s.intensity_absolute
      }))
      .slice(0, 5);

    // 6. Coverage score: domain coverage 60% weight, entity type coverage 40% weight
    const domainCoverage = (EXPECTED_DOMAINS.length - missingDomains.length) / EXPECTED_DOMAINS.length;
    const entityCoverage = (EXPECTED_ENT_TYPES.length - missingEntityTypes.length) / EXPECTED_ENT_TYPES.length;
    const coverageScore  = Math.round((domainCoverage * 0.6 + entityCoverage * 0.4) * 100) / 100;

    const summary = missingDomains.length === 0
      ? 'Profile coverage is strong across all expected domains.'
      : `${missingDomains.length} domain(s) underrepresented: ${missingDomains.join(', ')}.`;

    return NextResponse.json({
      coverage_score:       coverageScore,
      missing_domains:      missingDomains,
      weak_entities:        weakEntities,
      missing_entity_types: missingEntityTypes,
      weak_signals:         weakSignals,
      summary
    });

  } catch (err: any) {
    console.error('[API/Cognitive/Gaps]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
