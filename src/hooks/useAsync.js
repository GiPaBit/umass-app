import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Run an async loader on mount and expose a `refresh()` for pull-to-refresh.
 * The spec calls for fresh data on every tab load, so there is no cache layer —
 * `refresh` always re-hits the network.
 */
export function useAsync(loader, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled });
  // Guards against a slow first response overwriting a newer one.
  const runId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async ({ silent = false } = {}) => {
      if (!enabled) {
        setState({ data: null, error: null, loading: false });
        return;
      }
      const id = ++runId.current;
      setState((s) => ({ ...s, loading: !silent, error: silent ? s.error : null }));
      try {
        const data = await loader();
        if (mounted.current && id === runId.current) setState({ data, error: null, loading: false });
      } catch (error) {
        if (mounted.current && id === runId.current) {
          setState((s) => ({ data: silent ? s.data : null, error, loading: false }));
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, ...deps],
  );

  useEffect(() => {
    run();
  }, [run]);

  /** Silent refresh keeps the current content on screen while new data loads. */
  const refresh = useCallback(() => run({ silent: true }), [run]);

  return { ...state, refresh, reload: run };
}
