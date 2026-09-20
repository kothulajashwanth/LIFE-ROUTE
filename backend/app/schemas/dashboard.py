"""Schemas for Dashboard Summary API."""

from typing import Dict, Any, List
from pydantic import BaseModel, Field
from backend.app.schemas.common import ProvenanceEnum


class DashboardSummaryResponse(BaseModel):
    """Aggregated system-wide summary for frontend executive command center."""
    timestamp: str
    network_overview: Dict[str, Any] = Field(
        ...,
        example={"total_segments": 436, "total_nodes": 120, "signalized_intersections": 90},
    )
    congestion_distribution: Dict[str, int] = Field(
        ...,
        example={"NORMAL": 395, "WATCH": 28, "CONGESTED": 11, "SEVERE": 2},
    )
    incident_summary: Dict[str, Any] = Field(
        ...,
        example={"active_incidents": 4, "by_type": {"accident_like": 2, "lane_blockage": 2}},
    )
    forecast_outlook: Dict[str, Any] = Field(
        ...,
        example={"average_network_speed_15m": 48.2, "segments_at_breakdown_risk": 5},
    )
    propagation_risk: Dict[str, Any] = Field(
        ...,
        example={"active_bottleneck_seeds": 8, "high_spillback_impact_events": 2},
    )
    recommendations_summary: Dict[str, Any] = Field(
        ...,
        example={"tactical_operational": 15, "strategic_capital": 25, "critical_urgency": 3},
    )
    provenance_classification: Dict[str, str] = Field(
        default={
            "network_geometry": ProvenanceEnum.OBSERVED.value,
            "congestion_state": ProvenanceEnum.DERIVED.value,
            "incident_intelligence": ProvenanceEnum.DERIVED.value,
            "traffic_forecasts": ProvenanceEnum.DERIVED.value,
            "propagation_footprint": ProvenanceEnum.DERIVED.value,
            "counterfactual_simulations": ProvenanceEnum.SIMULATED.value,
            "recommendations": ProvenanceEnum.DERIVED.value,
        }
    )
