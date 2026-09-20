"""Schemas for What-If Simulation API."""

from typing import Optional
from pydantic import BaseModel, Field
from backend.app.schemas.common import ProvenanceEnum


class SimulationRunRequest(BaseModel):
    """Request payload to execute a counterfactual intervention simulation."""
    target_segment: str = Field(..., example="R0005")
    candidate_id: str = Field(..., example="PLAN0004")
    baseline_flow_vph: Optional[float] = Field(None, example=1800.0)
    baseline_observed_speed_kmh: Optional[float] = Field(None, example=25.0)
    baseline_queue_veh: Optional[float] = Field(None, example=20.0)
    scenario_id: Optional[str] = Field("USER_SIMULATION", example="USER_SIMULATION")


class SimulationRunResponse(BaseModel):
    """Result of what-if intervention simulation matching Step 8 verified schema."""
    timestamp: str
    scenario_id: str
    target_segment: str
    candidate_id: str
    intervention_type: str
    capacity_delta_vph: int
    cost_index: int
    feasibility_band: str

    # Observed baseline
    baseline_observed_speed_kmh: float
    baseline_flow_vph: float
    baseline_queue_veh: float

    # Theoretical BPR
    baseline_theoretical_travel_time_min: float
    counterfactual_theoretical_travel_time_min: float
    counterfactual_speed_kmh: float
    speed_delta_kmh: float

    # Delays
    baseline_delay_s: float
    counterfactual_delay_s: float
    delay_reduction_s: float
    delay_reduction_pct: float

    # Queues & Spillback
    counterfactual_queue_veh: float
    baseline_spillback_risk: float
    counterfactual_spillback_risk: float

    # Network propagation impact
    baseline_impacted_segments: int
    counterfactual_impacted_segments: int
    segments_relieved: int

    evidence_reason: str
    provenance: str = ProvenanceEnum.SIMULATED.value
