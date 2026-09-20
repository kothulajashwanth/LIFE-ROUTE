import { api } from "./client";
import { IncidentListResponse, IncidentQueryParams } from "@/types/incidents";

/**
 * Fetch verified incident intelligence records from FastAPI backend.
 * GET /api/incidents
 */
export async function getIncidents(
  params?: IncidentQueryParams
): Promise<IncidentListResponse> {
  const query = new URLSearchParams();

  if (params?.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
  if (params?.offset !== undefined) {
    query.set("offset", String(params.offset));
  }
  if (params?.incident_state) {
    query.set("incident_state", params.incident_state);
  }
  if (params?.severity !== undefined) {
    query.set("severity", String(params.severity));
  }

  const queryString = query.toString();
  const endpoint = `/api/incidents${queryString ? `?${queryString}` : ""}`;

  return api.get<IncidentListResponse>(endpoint);
}
