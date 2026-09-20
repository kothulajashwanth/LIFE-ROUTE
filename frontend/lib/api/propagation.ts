import { api } from "./client";
import {
  PropagationListResponse,
  PropagationQueryParams,
} from "@/types/propagation";

/**
 * Fetch multi-hop queue spillback and network propagation footprints from FastAPI.
 * GET /api/propagation
 */
export async function getPropagation(
  params?: PropagationQueryParams
): Promise<PropagationListResponse> {
  const query = new URLSearchParams();

  if (params?.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
  if (params?.offset !== undefined) {
    query.set("offset", String(params.offset));
  }
  if (params?.seed_segment_id) {
    query.set("seed_segment_id", params.seed_segment_id);
  }
  if (params?.risk_level) {
    query.set("risk_level", params.risk_level);
  }

  const queryString = query.toString();
  const endpoint = `/api/propagation${queryString ? `?${queryString}` : ""}`;

  return api.get<PropagationListResponse>(endpoint);
}
