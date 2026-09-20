import { PaginationMeta } from "./api";

export interface PropagationRecord {
  timestamp: string;
  seed_segment_id: string;
  propagated_segment_id: string;
  direction: string;
  hops: number;
  horizon_min: number;
  propagation_score: number;
  risk_level: string;
  evidence_reason: string;
  provenance: string;
}

export interface PropagationListResponse {
  meta: PaginationMeta;
  data: PropagationRecord[];
}

export interface PropagationQueryParams {
  limit?: number;
  offset?: number;
  seed_segment_id?: string;
  risk_level?: string;
  direction?: string;
}
