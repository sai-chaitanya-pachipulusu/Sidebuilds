import { useEffect, useState } from "react";
import api from "../services/api";
export function useBrowseData(params, enabled = true) {
  const key = JSON.stringify(params);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({
    loading: true,
    projects: [],
    pagination: null,
    error: "",
  });
  useEffect(() => {
    let active = true;
    if (!enabled) {
      setState((old) => ({ ...old, loading: false, error: "" }));
      return undefined;
    }
    setState((old) => ({ ...old, loading: true, error: "" }));
    api
      .get("/public/marketplace", { params: JSON.parse(key) })
      .then(({ data }) => {
        if (
          !Array.isArray(data?.data) ||
          !data.pagination ||
          !Number.isSafeInteger(Number(data.pagination.total)) ||
          Number(data.pagination.total) < 0
        )
          throw new Error("Invalid listing response");
        if (active)
          setState({
            loading: false,
            projects: data.data,
            pagination: data.pagination,
            error: "",
          });
      })
      .catch((error) => {
        const validation =
          error?.response?.status === 400 &&
          typeof error.response.data?.error === "string"
            ? error.response.data.error
            : "";
        if (active)
          setState({
            loading: false,
            projects: [],
            pagination: null,
            error: validation
              ? `${validation} Adjust the filters and try again.`
              : "Projects could not be loaded. Check your connection and try again.",
          });
      });
    return () => {
      active = false;
    };
  }, [key, attempt, enabled]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
export function useBrowseStats() {
  const [state, setState] = useState({ loading: true, values: null });
  useEffect(() => {
    let active = true;
    api
      .get("/public/stats/marketplace")
      .then(({ data }) => {
        const raw = [
          data.active_listings,
          data.projects_count,
          data.users_count,
        ];
        if (raw.some((value) => value == null || value === ""))
          throw new Error("Missing statistics");
        const values = raw.map(Number);
        if (!values.every((value) => Number.isSafeInteger(value) && value >= 0))
          throw new Error("Invalid statistics");
        if (active) setState({ loading: false, values });
      })
      .catch(() => {
        if (active) setState({ loading: false, values: null });
      });
    return () => {
      active = false;
    };
  }, []);
  return state;
}
