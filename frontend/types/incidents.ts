/**
 * Types for Incident Intelligence API (GET /api/incidents).
 */

import { ProvenanceType, PaginationMeta } from "./api";

export type IncidentState =
  | "INCIDENT_SUPPORTED"
  | "INCIDENT_UNSUPPORTED"
  | "NO_INCIDENT_EVIDENCE"
  | "ROADWORK_SUPPORTED"
  | string;

export interface IncidentRecord {
  timestamp: string;
  segment_id: string;
  source_node?: string | null;
  target_node?: string | null;

  // Incident Classification
  incident_state: IncidentState;
  matched_incident_id?: string | null;
  incident_type?: string | null;
  severity: number; // 0, 1, 2, 3
  lanes_blocked: number;
  incident_lifecycle?: string | null;
  incident_confidence: number;

  // Traffic state evidence
  speed_kmh: number;
  flow_vph: number;
  queue_length_veh: number;
  congestion_state: string;
  traffic_evidence?: string | null;
  incident_reasoning?: string | null;
  provenance: ProvenanceType | string;
}

export interface IncidentListResponse {
  meta: PaginationMeta;
  data: IncidentRecord[];
}

export interface IncidentQueryParams {
  limit?: number;
  offset?: number;
  incident_state?: string;
  severity?: number;
}
