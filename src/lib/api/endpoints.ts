/**
 * Canonical map of all App Router API endpoints.
 * Keep in sync with src/app/api route handlers and docs/API_ENDPOINTS.md.
 */
export const API_ENDPOINTS = {
  auth: {
    signup: { path: '/api/auth/signup', methods: ['POST'] as const },
    login: { path: '/api/auth/login', methods: ['POST'] as const },
    logout: { path: '/api/auth/logout', methods: ['POST'] as const },
    me: { path: '/api/auth/me', methods: ['GET'] as const },
  },
  health: {
    system: { path: '/api/health/system', methods: ['GET'] as const },
    persona: { path: '/api/health/persona', methods: ['GET'] as const },
    output: { path: '/api/health/output', methods: ['GET'] as const },
    recommendation: { path: '/api/health/recommendation', methods: ['GET'] as const },
  },
  admin: {
    seed: { path: '/api/admin/seed', methods: ['POST'] as const },
    diagnose: { path: '/api/admin/diagnose', methods: ['POST'] as const },
    sandboxTest: { path: '/api/admin/sandbox-test', methods: ['GET'] as const },
    semanticDiagnose: { path: '/api/admin/semantic-diagnose', methods: ['POST'] as const },
    personaHealth: { path: '/api/admin/persona-health', methods: ['GET'] as const },
    modelHealth: { path: '/api/admin/model-health', methods: ['GET'] as const },
    outputHealth: { path: '/api/admin/output-health', methods: ['GET'] as const },
    publishingHealth: { path: '/api/admin/publishing-health', methods: ['GET'] as const },
    provenanceHealth: { path: '/api/admin/provenance-health', methods: ['GET'] as const },
    recommendationHealth: { path: '/api/admin/recommendation-health', methods: ['GET'] as const },
    systemHealth: { path: '/api/admin/system-health', methods: ['GET'] as const },
    checklist: { path: '/api/admin/checklist', methods: ['GET', 'PATCH'] as const },
  },
  analytics: {
    content: { path: '/api/analytics/content', methods: ['GET'] as const },
  },
  cms: {
    content: { path: '/api/cms/content', methods: ['GET', 'POST', 'PATCH', 'DELETE'] as const },
    showcase: { path: '/api/showcase', methods: ['GET'] as const },
  },
  automation: {
    rules: { path: '/api/automation/rules', methods: ['GET'] as const },
  },
  blob: {
    list: { path: '/api/blob', methods: ['GET', 'POST', 'DELETE'] as const },
    byId: { path: '/api/blob/[id]', methods: ['GET', 'DELETE'] as const },
    stats: { path: '/api/blob/stats', methods: ['GET'] as const },
    promote: { path: '/api/blob/promote', methods: ['POST'] as const },
    reject: { path: '/api/blob/reject', methods: ['POST'] as const },
    review: { path: '/api/blob/review', methods: ['POST'] as const },
    promotable: { path: '/api/blob/promotable', methods: ['POST'] as const },
    bulk: { path: '/api/blob/bulk', methods: ['POST'] as const },
    cleanup: { path: '/api/blob/cleanup', methods: ['POST'] as const },
  },
  chat: { stream: { path: '/api/chat', methods: ['POST'] as const } },
  upload: { file: { path: '/api/upload', methods: ['POST'] as const } },
  cognitive: {
    decide: { path: '/api/cognitive/decide', methods: ['POST'] as const },
    evaluate: { path: '/api/cognitive/evaluate', methods: ['POST'] as const },
    feedback: { path: '/api/cognitive/feedback', methods: ['POST'] as const },
    gaps: { path: '/api/cognitive/gaps', methods: ['POST'] as const },
    history: { path: '/api/cognitive/history', methods: ['GET'] as const },
    prioritize: { path: '/api/cognitive/prioritize', methods: ['POST'] as const },
    traces: { path: '/api/cognitive/traces', methods: ['GET'] as const },
  },
  ingest: {
    article: { path: '/api/ingest/article', methods: ['POST'] as const },
    email: { path: '/api/ingest/email', methods: ['POST'] as const },
    rss: { path: '/api/ingest/rss', methods: ['POST'] as const },
  },
  memory: {
    audit: { path: '/api/memory/audit', methods: ['GET'] as const },
    get: { path: '/api/memory/get', methods: ['GET'] as const },
    list: { path: '/api/memory/list', methods: ['GET'] as const },
    monitor: { path: '/api/memory/monitor', methods: ['GET'] as const },
    packetAction: { path: '/api/memory/packet/action', methods: ['POST'] as const },
    packets: { path: '/api/memory/packets', methods: ['GET'] as const },
    replay: { path: '/api/memory/replay', methods: ['POST'] as const },
    retrieve: { path: '/api/memory/retrieve', methods: ['POST'] as const },
    signals: { path: '/api/memory/signals', methods: ['GET'] as const },
    stats: { path: '/api/memory/stats', methods: ['GET'] as const },
  },
  output: {
    generate: { path: '/api/output/generate', methods: ['POST'] as const },
    drafts: { path: '/api/output/drafts', methods: ['GET'] as const },
    history: { path: '/api/output/history', methods: ['GET'] as const },
    publish: { path: '/api/output/publish', methods: ['POST'] as const },
    schedule: { path: '/api/output/schedule', methods: ['POST'] as const },
  },
  persona: {
    adaptiveUi: { path: '/api/persona/adaptive-ui', methods: ['GET', 'PATCH'] as const },
    drift: { path: '/api/persona/drift', methods: ['GET'] as const },
    feedback: { path: '/api/persona/feedback', methods: ['POST'] as const },
    profile: { path: '/api/persona/profile', methods: ['GET'] as const },
    rebuild: { path: '/api/persona/rebuild', methods: ['POST'] as const },
    style: { path: '/api/persona/style', methods: ['GET'] as const },
    traits: { path: '/api/persona/traits', methods: ['GET'] as const },
  },
  processing: {
    entities: { path: '/api/processing/entities', methods: ['GET'] as const },
    intelligence: { path: '/api/processing/intelligence', methods: ['GET', 'POST'] as const },
    semantic: { path: '/api/processing/semantic', methods: ['GET', 'POST'] as const },
    signals: { path: '/api/processing/signals', methods: ['GET', 'POST'] as const },
    topics: { path: '/api/processing/topics', methods: ['GET'] as const },
  },
  profile: {
    byUsername: { path: '/api/profile/[username]', methods: ['GET', 'POST', 'PATCH'] as const },
    sections: { path: '/api/profile/[username]/sections', methods: ['GET', 'POST', 'PATCH', 'DELETE'] as const },
    publish: { path: '/api/profile/[username]/publish', methods: ['POST'] as const },
  },
  // Flat entries for route-file parity tests
  profileSectionsRoute: { path: '/api/profile/[username]/sections', methods: ['GET', 'POST', 'PATCH', 'DELETE'] as const },
  profilePublishRoute: { path: '/api/profile/[username]/publish', methods: ['POST'] as const },
  semantic: {
    search: { path: '/api/semantic/search', methods: ['GET'] as const },
    graph: { path: '/api/semantic/graph', methods: ['GET'] as const },
    timeline: { path: '/api/semantic/timeline', methods: ['GET'] as const },
  },
  system: {
    features: { path: '/api/system/features', methods: ['GET', 'PATCH'] as const },
  },
  recommendations: {
    list: { path: '/api/recommendations', methods: ['GET'] as const },
  },
  jobs: {
    run: { path: '/api/jobs/run', methods: ['GET', 'POST'] as const },
  },
  workflows: {
    logs: { path: '/api/workflows/logs', methods: ['GET'] as const },
    run: { path: '/api/workflows/run', methods: ['POST'] as const },
  },
} as const;

export type ApiEndpoint = { path: string; methods: readonly string[] };

/** Flat list for validation tests and tooling */
export function listApiEndpoints(): ApiEndpoint[] {
  const out: ApiEndpoint[] = [];
  const walk = (node: Record<string, unknown>) => {
    for (const value of Object.values(node)) {
      if (value && typeof value === 'object' && 'path' in value && 'methods' in value) {
        out.push(value as ApiEndpoint);
      } else if (value && typeof value === 'object') {
        walk(value as Record<string, unknown>);
      }
    }
  };
  walk(API_ENDPOINTS as unknown as Record<string, unknown>);
  return out;
}

/** UI-facing shortcuts (subset used by dashboard pages) */
export const UI_API = {
  chat: API_ENDPOINTS.chat.stream.path,
  upload: API_ENDPOINTS.upload.file.path,
  outputGenerate: API_ENDPOINTS.output.generate.path,
  outputSchedule: API_ENDPOINTS.output.schedule.path,
  outputPublish: API_ENDPOINTS.output.publish.path,
  outputDrafts: API_ENDPOINTS.output.drafts.path,
  outputHistory: API_ENDPOINTS.output.history.path,
  cmsContent: API_ENDPOINTS.cms.content.path,
  showcase: API_ENDPOINTS.cms.showcase.path,
  systemFeatures: API_ENDPOINTS.system.features.path,
  recommendations: API_ENDPOINTS.recommendations.list.path,
  healthSystem: API_ENDPOINTS.health.system.path,
  healthPersona: API_ENDPOINTS.health.persona.path,
  healthOutput: API_ENDPOINTS.health.output.path,
  healthRecommendation: API_ENDPOINTS.health.recommendation.path,
  healthSystemAdmin: API_ENDPOINTS.admin.systemHealth.path,
  automationRules: API_ENDPOINTS.automation.rules.path,
  memoryStats: API_ENDPOINTS.memory.stats.path,
  memoryList: API_ENDPOINTS.memory.list.path,
  memoryPackets: API_ENDPOINTS.memory.packets.path,
  memorySignals: API_ENDPOINTS.memory.signals.path,
  memoryMonitor: API_ENDPOINTS.memory.monitor.path,
  blobList: API_ENDPOINTS.blob.list.path,
  blobStats: API_ENDPOINTS.blob.stats.path,
  cognitiveDecide: API_ENDPOINTS.cognitive.decide.path,
  cognitiveEvaluate: API_ENDPOINTS.cognitive.evaluate.path,
  cognitiveFeedback: API_ENDPOINTS.cognitive.feedback.path,
  cognitiveGaps: API_ENDPOINTS.cognitive.gaps.path,
  cognitiveHistory: API_ENDPOINTS.cognitive.history.path,
  personaProfile: API_ENDPOINTS.persona.profile.path,
  personaTraits: API_ENDPOINTS.persona.traits.path,
  personaAdaptiveUi: API_ENDPOINTS.persona.adaptiveUi.path,
  personaDrift: API_ENDPOINTS.persona.drift.path,
  personaFeedback: API_ENDPOINTS.persona.feedback.path,
  authMe: API_ENDPOINTS.auth.me.path,
  authLogin: API_ENDPOINTS.auth.login.path,
  authSignup: API_ENDPOINTS.auth.signup.path,
  authLogout: API_ENDPOINTS.auth.logout.path,
} as const;

export function profilePath(username: string, sub?: 'sections' | 'publish') {
  const base = `/api/profile/${encodeURIComponent(username)}`;
  if (sub === 'sections') return `${base}/sections`;
  if (sub === 'publish') return `${base}/publish`;
  return base;
}
