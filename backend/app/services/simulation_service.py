"""Simulation Service wrapping Step 8 verified What-If Simulator.

Executes counterfactual evaluations directly using the verified Step 8
implementation (ai.simulation.simulator.WhatIfSimulator).
Does NOT duplicate or alter the simulation physics.
"""

from typing import Dict, Any, Optional
from ai.network.graph import RoadNetworkGraph
from ai.simulation.intervention import InterventionManager, PlanningCandidate
from ai.simulation.simulator import WhatIfSimulator
from backend.app.schemas.common import ProvenanceEnum


class SimulationService:
    """Service to execute what-if intervention simulations."""

    def __init__(self):
        self.graph = RoadNetworkGraph()
        self.intervention_mgr = InterventionManager()
        self.simulator = WhatIfSimulator(
            graph=self.graph,
            intervention_mgr=self.intervention_mgr,
        )

    def run_simulation(
        self,
        target_segment: str,
        candidate_id: str,
        baseline_flow_vph: Optional[float] = None,
        baseline_observed_speed_kmh: Optional[float] = None,
        baseline_queue_veh: Optional[float] = None,
        scenario_id: str = "USER_SIMULATION",
    ) -> Dict[str, Any]:
        """Execute simulation for target segment and candidate ID."""
        seg_info = self.graph.get_segment(target_segment)
        if not seg_info:
            raise ValueError(f"Target segment '{target_segment}' does not exist in road network.")

        # Find matching candidate
        matching_cand: Optional[PlanningCandidate] = None
        for c in self.intervention_mgr.all_candidates:
            if c.candidate_id == candidate_id:
                matching_cand = c
                break

        if not matching_cand:
            raise ValueError(f"Candidate '{candidate_id}' does not exist in planning_candidates.csv.")

        # Default baseline values from segment physics if omitted
        flow = baseline_flow_vph if baseline_flow_vph is not None else (0.80 * seg_info.capacity_vph)
        speed = baseline_observed_speed_kmh if baseline_observed_speed_kmh is not None else (0.60 * seg_info.free_flow_speed_kmh)
        queue = baseline_queue_veh if baseline_queue_veh is not None else 20.0

        # Execute using verified Step 8 implementation
        res = self.simulator.simulate_candidate(
            candidate=matching_cand,
            target_segment=target_segment,
            timestamp="2026-01-15 12:00:00",
            scenario_id=scenario_id,
            baseline_flow_vph=flow,
            baseline_observed_speed_kmh=speed,
            baseline_queue_veh=queue,
            baseline_congestion_score=0.75,
        )

        res["provenance"] = ProvenanceEnum.SIMULATED.value
        return res


simulation_service = SimulationService()
