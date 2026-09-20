"""Schemas for Recommendations API."""

from typing import List, Optional
from pydantic import BaseModel
from backend.app.schemas.common import PaginationMeta, ProvenanceEnum


class RecommendationRecord(BaseModel):
    """Decision engine recommendation record."""
    timestamp: str
    target_segment: str
    recommendation_tier: str
    action_type: str
    candidate_id: str
    urgency_level: str
    mcda_score: float
    cost_index: int
    feasibility_band: str
    expected_delay_reduction_pct: float
    expected_queue_reduction_veh: float
    upstream_segments_protected: int
    primary_trigger_evidence: str
    operational_rationale: str
    engineering_limitations: str
    provenance: str = ProvenanceEnum.DERIVED.value


class RecommendationListResponse(BaseModel):
    """List of decision engine recommendations."""
    meta: PaginationMeta
    data: List[RecommendationRecord]
