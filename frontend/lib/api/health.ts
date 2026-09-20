import { api } from "./client";
import { HealthResponse } from "@/types/api";

/**
 * Basic health check API call against FastAPI GET /health.
 */
export async function checkBackendHealth(): Promise<HealthResponse> {
  return api.get<HealthResponse>("/health");
}
