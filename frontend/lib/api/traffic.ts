import { api } from "./client";
import { TrafficListResponse, TrafficQueryParams } from "@/types/traffic";

/**
 * Fetch current traffic records across network segments from FastAPI.
 * GET /api/traffic/current
 */
export async function getCurrentTraffic(
  params?: TrafficQueryParams
): Promise<TrafficListResponse> {
  const query = new URLSearchParams();

  if (params?.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
  if (params?.offset !== undefined) {
    query.set("offset", String(params.offset));
  }
  if (params?.segment_id) {
    query.set("segment_id", params.segment_id);
  }
  if (params?.congestion_state) {
    query.set("congestion_state", params.congestion_state);
  }

  const queryString = query.toString();
  const endpoint = `/api/traffic/current${queryString ? `?${queryString}` : ""}`;

  return api.get<TrafficListResponse>(endpoint);
}
