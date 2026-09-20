/**
 * Dashboard Summary types matching FastAPI /api/dashboard/summary response.
 */

import { ProvenanceType } from "./api";

export interface NetworkOverview {
  total_segments: number;
  total_nodes: number;
  signalized_intersections: number;
}

export interface CongestionDistribution {
  NORMAL: number;
  WATCH: number;
  CONGESTED: number;
  SEVERE: number;
}

export interface IncidentSummary {
  active_incidents: number;
  by_type?: Record<string, number>;
}

export interface ForecastOutlook {
  average_network_speed_15m: number;
  segments_at_breakdown_risk: number;
}

export interface PropagationRisk {
  active_bottleneck_seeds: number;
  high_spillback_impact_events: number;
}

export interface RecommendationsSummary {
  total?: number;
  tactical_operational?: number;
  strategic_capital?: number;
  critical_urgency?: number;
}

export interface DashboardSummaryResponse {
  timestamp: string;
  network_overview: NetworkOverview;
  congestion_distribution: CongestionDistribution;
  incident_summary: IncidentSummary;
  forecast_outlook: ForecastOutlook;
  propagation_risk: PropagationRisk;
  recommendations_summary?: RecommendationsSummary;
  provenance_classification?: Record<string, ProvenanceType>;
}
