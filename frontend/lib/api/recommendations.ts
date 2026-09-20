import { api } from "./client";
import {
  RecommendationListResponse,
  RecommendationQueryParams,
} from "@/types/recommendations";

/**
 * Fetch decision engine recommendations from FastAPI.
 * GET /api/recommendations
 */
export async function getRecommendations(
  params?: RecommendationQueryParams
): Promise<RecommendationListResponse> {
  const query = new URLSearchParams();

  if (params?.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
  if (params?.offset !== undefined) {
    query.set("offset", String(params.offset));
  }
  if (params?.tier) {
    query.set("tier", params.tier);
  }
  if (params?.urgency) {
    query.set("urgency", params.urgency);
  }
  if (params?.target_segment) {
    query.set("target_segment", params.target_segment);
  }

  const queryString = query.toString();
  const endpoint = `/api/recommendations${queryString ? `?${queryString}` : ""}`;

  return api.get<RecommendationListResponse>(endpoint);
}
