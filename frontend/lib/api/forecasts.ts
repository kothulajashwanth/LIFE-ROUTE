import { api } from "./client";
import {
  ForecastListResponse,
  ForecastQueryParams,
  SegmentForecastDetail,
} from "@/types/forecasts";

/**
 * Fetch multi-horizon traffic forecasts across segments from FastAPI.
 * GET /api/forecasts
 */
export async function getForecasts(
  params?: ForecastQueryParams
): Promise<ForecastListResponse> {
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

  const queryString = query.toString();
  const endpoint = `/api/forecasts${queryString ? `?${queryString}` : ""}`;

  return api.get<ForecastListResponse>(endpoint);
}

/**
 * Fetch detailed forecast trajectory with uncertainty bounds for a specific segment.
 * GET /api/forecasts/{segment_id}
 */
export async function getSegmentForecast(
  segmentId: string
): Promise<SegmentForecastDetail> {
  return api.get<SegmentForecastDetail>(
    `/api/forecasts/${encodeURIComponent(segmentId)}`
  );
}
