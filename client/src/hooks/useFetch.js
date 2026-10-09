import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Loads data with a promise-returning function and tracks loading/error state.
 *
 * - Re-runs whenever a value in `deps` changes (e.g. filters or page number).
 * - Keeps the previous data while reloading so tables don't flash empty.
 * - Ignores responses from outdated requests (a slow page 1 cannot overwrite page 2).
 *
 * @template T
 * @param {() => Promise<T>} fetcher
 * @param {unknown[]} [deps]
 * @returns {{ data: T|null, loading: boolean, error: unknown, refetch: () => void }}
 */
export default function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [reloadToken, setReloadToken] = useState(0);
  // Always call the latest fetcher without making it a dependency (it is usually an inline arrow).
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let current = true;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    fetcherRef
      .current()
      .then((data) => current && setState({ data, loading: false, error: null }))
      .catch((error) => current && setState((previous) => ({ ...previous, loading: false, error })));

    return () => {
      current = false;
    };
    // `deps` is spread on purpose: callers pass the values the request depends on.
  }, [...deps, reloadToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  return { ...state, refetch };
}
