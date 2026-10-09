/** Dashboard API: one request returns every number and chart series the dashboard needs. */
import api from "./client";

export const getDashboardSummary = () => api.get("/dashboard/summary").then((res) => res.data);
