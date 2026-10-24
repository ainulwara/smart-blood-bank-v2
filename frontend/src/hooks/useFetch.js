import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "../utils/format";

// Runs an async function on mount (and when deps change) and tracks loading/error.
export default function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: "" });
    } catch (err) {
      setState({ data: null, loading: false, error: getErrorMessage(err, "Could not load data.") });
    }
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, reload: run };
}