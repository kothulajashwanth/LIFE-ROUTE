/**
 * Type definitions for LIFE ROUTE What-If Intervention Simulation (Step 8/11).
 * Matches FastAPI backend schema: backend/app/schemas/simulation.py
 */

export interface SimulationRunRequest {
  target_segment: string;
  candidate_id: string;
  baseline_flow_vph?: number | null;
  baseline_observed_speed_kmh?: number | null;
  baseline_queue_veh?: number | null;
  scenario_id?: string | null;
}

export interface SimulationRunResponse {
  timestamp: string;
  scenario_id: string;
  target_segment: string;
  candidate_id: string;
  intervention_type: string;
  capacity_delta_vph: number;
  cost_index: number;
  feasibility_band: string;

  // Observed baseline
  baseline_observed_speed_kmh: number;
  baseline_flow_vph: number;
  baseline_queue_veh: number;

  // Theoretical BPR
  baseline_theoretical_travel_time_min: number;
  counterfactual_theoretical_travel_time_min: number;
  counterfactual_speed_kmh: number;
  speed_delta_kmh: number;

  // Delays
  baseline_delay_s: number;
  counterfactual_delay_s: number;
  delay_reduction_s: number;
  delay_reduction_pct: number;

  // Queues & Spillback
  counterfactual_queue_veh: number;
  baseline_spillback_risk: number;
  counterfactual_spillback_risk: number;

  // Network propagation impact
  baseline_impacted_segments: number;
  counterfactual_impacted_segments: number;
  segments_relieved: number;

  evidence_reason: string;
  provenance: string;
}

export interface AvailableCandidate {
  candidate_id: string;
  target_segment: string;
  intervention_type: string;
  capacity_delta_vph?: number;
  cost_index: number;
  feasibility_band: string;
  expected_delay_reduction_pct?: number;
  expected_queue_reduction_veh?: number;
  primary_trigger_evidence?: string;
  operational_rationale?: string;
  engineering_limitations?: string;
}
