/**
 * Traffic intelligence types matching FastAPI /api/traffic/current response.
 */

import { ProvenanceType, PaginationMeta } from "./api";

export type CongestionState = "NORMAL" | "WATCH" | "CONGESTED" | "SEVERE";

export interface TrafficRecord {
  timestamp: string;
  segment_id: string;
  source_node?: string | null;
  target_node?: string | null;

  // Observed metrics
  speed_kmh: number;
  flow_vph: number;
  occupancy_pct: number;
  queue_length_veh: number;
  delay_min: number;

  // Model-derived metrics
  congestion_score: number;
  congestion_state: CongestionState | string;
  is_anomaly: number;
  anomaly_type: string;
  confidence: number;
  temporal_status: string;
  roadwork_context: string;
  evidence_reason: string;
  provenance: ProvenanceType | string;
}

export interface TrafficListResponse {
  meta: PaginationMeta;
  data: TrafficRecord[];
}

export interface TrafficQueryParams {
  limit?: number;
  offset?: number;
  segment_id?: string;
  congestion_state?: string;
}
