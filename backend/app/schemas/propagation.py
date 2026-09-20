"""Schemas for Network Propagation API."""

from typing import List, Optional
from pydantic import BaseModel
from backend.app.schemas.common import PaginationMeta, ProvenanceEnum


class PropagationRecord(BaseModel):
    """Network congestion propagation or downstream starvation event."""
    timestamp: str
    seed_segment_id: str
    propagated_segment_id: str
    direction: str
    hops: int
    horizon_min: int
    propagation_score: float
    risk_level: str
    evidence_reason: str
    provenance: str = ProvenanceEnum.DERIVED.value


class PropagationListResponse(BaseModel):
    """List of propagation footprint records."""
    meta: PaginationMeta
    data: List[PropagationRecord]
