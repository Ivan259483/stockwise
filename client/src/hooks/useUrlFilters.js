import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Stores list filters (search, status, page, ...) in the URL query string so
 * they survive a refresh and can be shared or bookmarked.
 *
 * Changing any filter other than `page` resets to page 1, because the old page
 * number may not exist in the new result set.
 *
 * @param {Record<string, string>} defaults Default value per filter key.
 * @returns {[Record<string, string>, (changes: Record<string, string|number>) => void]}
 */
export default function useUrlFilters(defaults) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, searchParams.get(key) ?? value])),
    // `defaults` is a constant object literal per page; only the URL matters here.
    [searchParams] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const setFilters = useCallback(
    (changes) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, value] of Object.entries(changes)) {
            if (value === "" || value === null || value === undefined || String(value) === defaults[key]) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }
          if (!("page" in changes)) next.delete("page");
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return [filters, setFilters];
}
