/**
 * Context Filter (L3.0)
 * --------------------
 * Quality control for the raw context fetched from MongoDB.
 * Note: intelligence (L4) is injected separately by the orchestrator.
 */

export function filterContext(ctx: any) {
  return {
    entities: (ctx.entities || []).filter((e: any) => e.confidence >= 0.7),
    signals: (ctx.signals || []).filter((s: any) => s.confidence >= 0.6),
    relationships: (ctx.relationships || []).slice(0, 20)
  };
}
