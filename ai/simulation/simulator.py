"""Deterministic Counterfactual What-If Intervention Simulator.

Simulates network and segment performance under candidate interventions from planning_candidates.csv:
- Capacity perturbation (C_counter = C_base + capacity_delta_vph)
- Cross-section updates (lanes_counter = lanes_base + 1 for lane_addition)
- BPR theoretical travel time, operating speed, and delay reduction
- Fluid queue discharge over horizon delta_t (default 15 minutes)
- Upstream spillback risk and multi-hop propagation footprint attenuation
- Zero synthetic candidates, zero topology creation for connector
"""

import math
from typing import Dict, List, Optional, Any
import numpy as np
import pandas as pd

from ai.network.graph import RoadNetworkGraph
from ai.network.scoring import PropagationScorer
from ai.simulation.bpr import BPRCalculator
from ai.simulation.queue_model import QueueModel
from ai.simulation.intervention import PlanningCandidate, InterventionManager


class WhatIfSimulator:
    """Evaluates candidate interventions against baseline network states."""

    def __init__(
        self,
        graph: Optional[RoadNetworkGraph] = None,
        intervention_mgr: Optional[InterventionManager] = None,
        bpr_calc: Optional[BPRCalculator] = None,
        queue_model: Optional[QueueModel] = None,
    ):
        """Initialize simulator with network graph and models."""
        self.graph = graph if graph is not None else RoadNetworkGraph()
        self.intervention_mgr = (
            intervention_mgr if intervention_mgr is not None else InterventionManager()
        )
        self.bpr_calc = bpr_calc if bpr_calc is not None else BPRCalculator(alpha=0.15, beta=4.0)
        self.queue_model = queue_model if queue_model is not None else QueueModel(delta_t_minutes=15.0, k_jam=130.0)
        self.scorer = PropagationScorer()

    def simulate_candidate(
        self,
        candidate: PlanningCandidate,
        target_segment: str,
        timestamp: str,
        scenario_id: str,
        baseline_flow_vph: float,
        baseline_observed_speed_kmh: float,
        baseline_queue_veh: float,
        baseline_congestion_score: float = 0.70,
    ) -> Dict[str, Any]:
        """Run counterfactual simulation for a specific planning candidate on target segment."""
        segment_info = self.graph.get_segment(target_segment)
        if not segment_info:
            raise ValueError(f"Target segment {target_segment} not found in road network graph.")

        base_cap = segment_info.capacity_vph
        base_lanes = segment_info.lanes
        length_km = segment_info.length_km
        ff_speed = segment_info.free_flow_speed_kmh

        # 1. Apply intervention parameters
        interv_data = self.intervention_mgr.apply_intervention(
            candidate, baseline_capacity_vph=base_cap, baseline_lanes=base_lanes
        )
        counter_cap = interv_data["counterfactual_capacity_vph"]
        counter_lanes = interv_data["counterfactual_lanes"]

        # 2. BPR Theoretical Travel Time & Operating Speed
        bpr_res = self.bpr_calc.evaluate_intervention(
            length_km=length_km,
            free_flow_speed_kmh=ff_speed,
            flow_vph=baseline_flow_vph,
            baseline_capacity_vph=base_cap,
            counterfactual_capacity_vph=counter_cap,
        )

        # 3. Queue & Storage Dynamics
        base_storage = self.queue_model.calculate_storage_capacity(length_km, base_lanes)
        counter_storage = self.queue_model.calculate_storage_capacity(length_km, counter_lanes)
        counter_queue = self.queue_model.calculate_counterfactual_queue(
            baseline_queue_veh=baseline_queue_veh,
            capacity_delta_vph=candidate.capacity_delta_vph,
        )

        # 4. Spillback Risk & Propagation Footprint Analysis
        upstream_segs = self.graph.get_upstream_segments(target_segment)
        feeder_flow = 0.85 * base_cap
        feeder_cap = base_cap
        feeder_green = segment_info.green_ratio

        if upstream_segs:
            first_up = self.graph.get_segment(upstream_segs[0])
            if first_up:
                feeder_cap = first_up.capacity_vph
                feeder_green = first_up.green_ratio

        base_spill_risk = self.scorer.compute_spillback_risk(
            q_seed=baseline_queue_veh,
            storage_seed=base_storage,
            flow_upstream=feeder_flow,
            capacity_upstream=feeder_cap,
            green_ratio_upstream=feeder_green,
        )
        counter_spill_risk = self.scorer.compute_spillback_risk(
            q_seed=counter_queue,
            storage_seed=counter_storage,
            flow_upstream=feeder_flow,
            capacity_upstream=feeder_cap,
            green_ratio_upstream=feeder_green,
        )

        # Multi-hop Propagation Footprint: Baseline vs Counterfactual
        base_impacted_count, counter_impacted_count = self._evaluate_propagation_footprint(
            seed_id=target_segment,
            base_severity=baseline_congestion_score,
            counter_severity=max(0.1, baseline_congestion_score * (base_cap / counter_cap)),
            base_queue=baseline_queue_veh,
            counter_queue=counter_queue,
            base_storage=base_storage,
            counter_storage=counter_storage,
        )
        segments_relieved = max(0, base_impacted_count - counter_impacted_count)

        # Explainable evidence reason
        evidence_reason = (
            f"Intervention {candidate.candidate_id} ({candidate.intervention_type}) on {target_segment}: "
            f"Capacity expanded from {base_cap:.0f} to {counter_cap:.0f} vph (+{candidate.capacity_delta_vph} vph). "
            f"Theoretical BPR delay reduced by {bpr_res['delay_reduction_s']:.1f}s ({bpr_res['delay_reduction_pct']:.1f}%). "
            f"Simulated queue decreased from {baseline_queue_veh:.1f} to {counter_queue:.1f} veh over 15m. "
            f"Spillback risk reduced from {base_spill_risk:.2f} to {counter_spill_risk:.2f}. "
            f"Relieved {segments_relieved} upstream segment(s) from propagation risk."
        )

        return {
            "timestamp": str(timestamp),
            "scenario_id": str(scenario_id),
            "target_segment": str(target_segment),
            "candidate_id": str(candidate.candidate_id),
            "intervention_type": str(candidate.intervention_type),
            "capacity_delta_vph": int(candidate.capacity_delta_vph),
            "cost_index": int(candidate.cost_index),
            "feasibility_band": str(candidate.feasibility_band),
            "baseline_observed_speed_kmh": round(float(baseline_observed_speed_kmh), 2),
            "baseline_flow_vph": round(float(baseline_flow_vph), 2),
            "baseline_queue_veh": round(float(baseline_queue_veh), 2),
            "baseline_theoretical_travel_time_min": bpr_res["baseline_theoretical_travel_time_min"],
            "counterfactual_theoretical_travel_time_min": bpr_res["counterfactual_theoretical_travel_time_min"],
            "counterfactual_speed_kmh": bpr_res["counterfactual_theoretical_speed_kmh"],
            "speed_delta_kmh": bpr_res["speed_delta_kmh"],
            "baseline_delay_s": bpr_res["baseline_delay_s"],
            "counterfactual_delay_s": bpr_res["counterfactual_delay_s"],
            "delay_reduction_s": bpr_res["delay_reduction_s"],
            "delay_reduction_pct": bpr_res["delay_reduction_pct"],
            "counterfactual_queue_veh": round(float(counter_queue), 2),
            "baseline_spillback_risk": round(float(base_spill_risk), 3),
            "counterfactual_spillback_risk": round(float(counter_spill_risk), 3),
            "baseline_impacted_segments": int(base_impacted_count),
            "counterfactual_impacted_segments": int(counter_impacted_count),
            "segments_relieved": int(segments_relieved),
            "evidence_reason": evidence_reason,
        }

    def simulate_no_candidate(
        self,
        target_segment: str,
        timestamp: str,
        scenario_id: str,
        baseline_flow_vph: float,
        baseline_observed_speed_kmh: float,
        baseline_queue_veh: float,
        incident_type: str = "incident",
    ) -> Dict[str, Any]:
        """Record explicit NO_CANDIDATE_AVAILABLE record for scenario target segment without candidates."""
        segment_info = self.graph.get_segment(target_segment)
        base_cap = segment_info.capacity_vph if segment_info else 1800.0
        ff_speed = segment_info.free_flow_speed_kmh if segment_info else 50.0
        length_km = segment_info.length_km if segment_info else 1.0

        bpr_res = self.bpr_calc.evaluate_intervention(
            length_km=length_km,
            free_flow_speed_kmh=ff_speed,
            flow_vph=baseline_flow_vph,
            baseline_capacity_vph=base_cap,
            counterfactual_capacity_vph=base_cap,
        )

        evidence = (
            f"Scenario {scenario_id} targets segment {target_segment} during {incident_type}. "
            f"No planning candidate exists in planning_candidates.csv for {target_segment}. "
            f"Marked strictly as NO_CANDIDATE_AVAILABLE without fabricating synthetic interventions."
        )

        return {
            "timestamp": str(timestamp),
            "scenario_id": str(scenario_id),
            "target_segment": str(target_segment),
            "candidate_id": "NO_CANDIDATE_AVAILABLE",
            "intervention_type": "none",
            "capacity_delta_vph": 0,
            "cost_index": 0,
            "feasibility_band": "none",
            "baseline_observed_speed_kmh": round(float(baseline_observed_speed_kmh), 2),
            "baseline_flow_vph": round(float(baseline_flow_vph), 2),
            "baseline_queue_veh": round(float(baseline_queue_veh), 2),
            "baseline_theoretical_travel_time_min": bpr_res["baseline_theoretical_travel_time_min"],
            "counterfactual_theoretical_travel_time_min": bpr_res["baseline_theoretical_travel_time_min"],
            "counterfactual_speed_kmh": bpr_res["baseline_theoretical_speed_kmh"],
            "speed_delta_kmh": 0.0,
            "baseline_delay_s": bpr_res["baseline_delay_s"],
            "counterfactual_delay_s": bpr_res["baseline_delay_s"],
            "delay_reduction_s": 0.0,
            "delay_reduction_pct": 0.0,
            "counterfactual_queue_veh": round(float(baseline_queue_veh), 2),
            "baseline_spillback_risk": 0.0,
            "counterfactual_spillback_risk": 0.0,
            "baseline_impacted_segments": 0,
            "counterfactual_impacted_segments": 0,
            "segments_relieved": 0,
            "evidence_reason": evidence,
        }

    def _evaluate_propagation_footprint(
        self,
        seed_id: str,
        base_severity: float,
        counter_severity: float,
        base_queue: float,
        counter_queue: float,
        base_storage: float,
        counter_storage: float,
    ) -> tuple[int, int]:
        """Traverse upstream graph up to 3 hops and count impacted segments under baseline vs counterfactual."""
        def traverse(s_seed: float, q_seed: float, storage_seed: float) -> int:
            impacted = set()
            queue = [(seed_id, 0, {seed_id})]

            while queue:
                curr_id, hop, visited = queue.pop(0)
                if hop >= 3:
                    continue

                upstream = self.graph.get_upstream_segments(curr_id)
                for up_id in upstream:
                    if up_id in visited:
                        continue
                    up_seg = self.graph.get_segment(up_id)
                    if not up_seg:
                        continue

                    new_hop = hop + 1
                    flow_est = 0.85 * up_seg.capacity_vph
                    p_score, risk_lvl = self.scorer.compute_propagation_score(
                        s_seed=s_seed,
                        hop=new_hop,
                        flow_feeder=flow_est,
                        capacity_feeder=up_seg.capacity_vph,
                        is_signalized=(up_seg.signal_id is not None),
                        green_ratio=up_seg.green_ratio,
                    )
                    if risk_lvl in ["MODERATE_PROPAGATION", "HIGH_SPILLBACK_IMPACT"]:
                        impacted.add(up_id)
                        queue.append((up_id, new_hop, visited | {up_id}))

            return len(impacted)

        base_impacted = traverse(base_severity, base_queue, base_storage)
        counter_impacted = traverse(counter_severity, counter_queue, counter_storage)
        return base_impacted, counter_impacted
