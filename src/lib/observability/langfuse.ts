type GenerationLike = {
  end: (payload?: unknown) => void;
};

type TraceLike = {
  event: (payload: { name: string; input?: unknown; output?: unknown }) => void;
  generation: (payload: { name: string; model?: string; input?: unknown }) => GenerationLike;
  update: (payload: { output?: unknown; input?: unknown }) => void;
};

type LangfuseLike = {
  trace: (payload: { name: string; userId?: string; input?: unknown }) => TraceLike;
  /** Flush buffered events — must be awaited before a serverless handler returns. */
  flush: () => Promise<void>;
};

function createNoopTrace(): TraceLike {
  return {
    event: () => {},
    generation: () => ({ end: () => {} }),
    update: () => {},
  };
}

const noop: LangfuseLike = {
  trace: () => createNoopTrace(),
  flush: async () => {},
};

/**
 * Langfuse observability facade.
 *
 * Real tracing activates only when BOTH `LANGFUSE_PUBLIC_KEY` and
 * `LANGFUSE_SECRET_KEY` are set (optionally `LANGFUSE_HOST`); otherwise every
 * call is a no-op. The SDK is pulled in via a lazy, guarded `require` so a build
 * or a runtime without the package degrades to the no-op instead of hard-failing
 * (the original build-safety concern). `flushAt: 1` + an explicit `flush()` make
 * delivery reliable in serverless, where background sends are killed on return.
 */
let cached: LangfuseLike | null = null;
let resolved = false;

function resolve(): LangfuseLike {
  if (resolved) return cached ?? noop;
  resolved = true;

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  if (!publicKey || !secretKey) {
    cached = null;
    return noop;
  }

  try {
    const { Langfuse } = require('langfuse');
    const client = new Langfuse({
      publicKey,
      secretKey,
      baseUrl: process.env.LANGFUSE_HOST || undefined,
      flushAt: 1,
    });
    cached = {
      trace: (payload) => client.trace(payload) as TraceLike,
      flush: () => client.flushAsync(),
    };
  } catch {
    cached = null;
  }
  return cached ?? noop;
}

const langfuse: LangfuseLike = {
  trace: (payload) => resolve().trace(payload),
  flush: () => resolve().flush(),
};

export default langfuse;
