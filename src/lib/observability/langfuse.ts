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
};

function createNoopTrace(): TraceLike {
  return {
    event: () => {},
    generation: () => ({ end: () => {} }),
    update: () => {},
  };
}

/**
 * Build-safe Langfuse facade.
 *
 * Some environments in this repo are deployed without the langfuse package/runtime.
 * A direct static import breaks production builds with `Module not found: langfuse`.
 * This no-op facade keeps observability call-sites stable while avoiding hard failure.
 */
const langfuse: LangfuseLike = {
  trace: () => createNoopTrace(),
};

export default langfuse;
