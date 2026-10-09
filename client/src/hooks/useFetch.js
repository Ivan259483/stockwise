import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Loads data with a promise-returning function and tracks loading/error state.
 *
 * - Re-runs whenever a value in `deps` changes (e.g. filters or page number).
 * - Keeps the previous data while reloading so tables don't flash empty.
 * - Ignores responses from outdated requests (a slow page 1 cannot overwrite page 2).
 *
 * `loading` is derived (the latest result belongs to an older request) rather
 * than stored, so the effect never has to set state synchronously.
 *
 * @template T
 * @param {() => Promise<T>} fetcher
 * @param {Array<string|number|boolean|null|undefined>} [deps] Primitive values the request depends on.
 * @returns {{ data: T|null, loading: boolean, error: unknown, refetch: () => void }}
 */
export default function useFetch(fetcher, deps = []) {
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });

  // Keep the latest fetcher without making it a dependency (callers pass inline arrows).
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  // One string identifies "this request"; a new key means a new fetch.
  const requestKey = JSON.stringify([...deps, reloadToken]);

  useEffect(() => {
    let current = true;
    fetcherRef.current().then(
      (data) => current && setResult({ key: requestKey, data, error: null }),
      (error) => current && setResult((previous) => ({ key: requestKey, data: previous.data, error }))
    );
    return () => {
      current = false;
    };
  }, [requestKey]);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);
  const settled = result.key === requestKey;

  return { data: result.data, loading: !settled, error: settled ? result.error : null, refetch };
}
