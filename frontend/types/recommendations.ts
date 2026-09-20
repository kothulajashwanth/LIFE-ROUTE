import { PaginationMeta } from "./api";

export interface RecommendationRecord {
  timestamp: string;
  target_segment: string;
  recommendation_tier: string;
  action_type: string;
  candidate_id: string;
  urgency_level: string;
  mcda_score: number;
  cost_index: number;
  feasibility_band: string;
  expected_delay_reduction_pct: number;
  expected_queue_reduction_veh: number;
  upstream_segments_protected: number;
  primary_trigger_evidence: string;
  operational_rationale: string;
  engineering_limitations: string;
  provenance: string;
}

export interface RecommendationListResponse {
  meta: PaginationMeta;
  data: RecommendationRecord[];
}

export interface RecommendationQueryParams {
  limit?: number;
  offset?: number;
  tier?: string;
  urgency?: string;
  target_segment?: string;
}
