'use client';

import { useEffect, useRef } from 'react';

/**
 * Runs `task` immediately, then every `intervalMs` while the tab is visible.
 * Polling pauses when the tab is hidden and refreshes once when it becomes visible again,
 * so background tabs do not keep hitting the API.
 */
export function usePolling(task: () => void | Promise<void>, intervalMs: number) {
  const taskRef = useRef(task);
  taskRef.current = task;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const run = () => { void taskRef.current(); };
    const start = () => {
      if (timer === null) timer = setInterval(run, intervalMs);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        run();
        start();
      }
    };

    run();
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);
}
