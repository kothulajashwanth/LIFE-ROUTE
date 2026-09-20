/**
 * Forecast intelligence types matching FastAPI /api/forecasts response.
 */

import { PaginationMeta, ProvenanceType } from "./api";

export interface ForecastRecord {
  timestamp: string;
  segment_id: string;
  current_speed_kmh: number;
  pred_speed_15m: number;
  pred_travel_time_15m_min: number;
  pred_congestion_state_15m: string;
  pred_speed_30m: number;
  pred_speed_45m: number;
  pred_speed_60m: number;
  provenance: ProvenanceType | string;
}

export interface HorizonDetail {
  pred_speed_kmh: number;
  lower_bound_95_pct?: number;
  upper_bound_95_pct?: number;
  pred_travel_time_min?: number;
  pred_congestion_state: string;
}

export interface SegmentForecastDetail {
  timestamp: string;
  segment_id: string;
  current_speed_kmh: number;
  horizons: Record<string, HorizonDetail>;
  provenance: ProvenanceType | string;
}

export interface ForecastListResponse {
  meta: PaginationMeta;
  data: ForecastRecord[];
}

export interface ForecastQueryParams {
  limit?: number;
  offset?: number;
  segment_id?: string;
}
