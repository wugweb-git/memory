import { UI_API } from './endpoints';
import { resolveUserId } from '@/config/identity';
import { apiRequest, ApiClientError } from '@/lib/ui/api-client';

export { apiRequest, ApiClientError };

type JsonBody = Record<string, unknown>;

function withUserId(params: URLSearchParams, userId?: string | null) {
  const uid = userId ?? resolveUserId().userId;
  params.set('userId', uid);
  return params;
}

/** Typed helpers for common UI flows */
export const api = {
  health: {
    system: () => apiRequest<unknown>(UI_API.healthSystem),
    persona: () => apiRequest<unknown>(UI_API.healthPersona),
    output: () => apiRequest<unknown>(UI_API.healthOutput),
    recommendation: () => apiRequest<unknown>(UI_API.healthRecommendation),
  },
  memory: {
    stats: () => apiRequest<unknown>(UI_API.memoryStats),
    list: (limit = 50) =>
      apiRequest<unknown>(`${UI_API.memoryList}?limit=${limit}`),
    packets: (opts?: { limit?: number; status?: string; source?: string }) => {
      const q = withUserId(new URLSearchParams());
      if (opts?.limit) q.set('limit', String(opts.limit));
      if (opts?.status) q.set('status', opts.status);
      if (opts?.source) q.set('source', opts.source);
      return apiRequest<unknown>(`${UI_API.memoryPackets}?${q}`);
    },
    monitor: () => apiRequest<unknown>(UI_API.memoryMonitor),
    signals: () => apiRequest<unknown>(UI_API.memorySignals),
  },
  blob: {
    list: (opts?: { limit?: number; type?: string; state?: string }) => {
      const q = new URLSearchParams();
      if (opts?.limit) q.set('limit', String(opts.limit));
      if (opts?.type) q.set('type', opts.type);
      if (opts?.state) q.set('state', opts.state);
      const qs = q.toString();
      return apiRequest<unknown>(qs ? `${UI_API.blobList}?${qs}` : UI_API.blobList);
    },
    stats: () => apiRequest<unknown>(UI_API.blobStats),
  },
  cognitive: {
    decide: (body: JsonBody) =>
      apiRequest<unknown>(UI_API.cognitiveDecide, { method: 'POST', body }),
    evaluate: (body: JsonBody) =>
      apiRequest<unknown>(UI_API.cognitiveEvaluate, { method: 'POST', body }),
    feedback: (body: JsonBody) =>
      apiRequest<unknown>(UI_API.cognitiveFeedback, { method: 'POST', body }),
    gaps: (body: JsonBody) =>
      apiRequest<unknown>(UI_API.cognitiveGaps, { method: 'POST', body }),
    history: (userId?: string) => {
      const q = withUserId(new URLSearchParams(), userId);
      return apiRequest<unknown>(`${UI_API.cognitiveHistory}?${q}`);
    },
  },
  persona: {
    profile: (userId?: string) => {
      const q = withUserId(new URLSearchParams(), userId);
      return apiRequest<unknown>(`${UI_API.personaProfile}?${q}`);
    },
    traits: (userId?: string) => {
      const q = withUserId(new URLSearchParams(), userId);
      return apiRequest<unknown>(`${UI_API.personaTraits}?${q}`);
    },
  },
  output: {
    generate: (body: JsonBody) =>
      apiRequest<unknown>(UI_API.outputGenerate, { method: 'POST', body }),
    schedule: (body: JsonBody) =>
      apiRequest<unknown>(UI_API.outputSchedule, { method: 'POST', body }),
    history: (userId?: string) => {
      const q = withUserId(new URLSearchParams(), userId);
      return apiRequest<unknown>(`${UI_API.outputHistory}?${q}`);
    },
  },
  auth: {
    me: () =>
      fetch(UI_API.authMe, { credentials: 'include' }).then((r) =>
        r.ok ? r.json() : null,
      ),
  },
};
