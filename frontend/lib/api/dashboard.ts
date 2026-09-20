import { api } from "./client";
import { DashboardSummaryResponse } from "@/types/dashboard";

/**
 * Fetch high-level executive dashboard summary from FastAPI backend.
 * GET /api/dashboard/summary
 */
export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  return api.get<DashboardSummaryResponse>("/api/dashboard/summary");
}
