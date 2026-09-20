"""Schemas for Current Traffic API."""

from typing import List, Optional
from pydantic import BaseModel, Field
from backend.app.schemas.common import PaginationMeta, ProvenanceEnum


class TrafficRecord(BaseModel):
    """Traffic intelligence record for a road segment."""
    timestamp: str
    segment_id: str
    source_node: Optional[str] = None
    target_node: Optional[str] = None
    
    # Observed
    speed_kmh: float
    flow_vph: float
    occupancy_pct: float
    queue_length_veh: float
    delay_min: float

    # Model-Derived
    congestion_score: float
    congestion_state: str
    is_anomaly: int
    anomaly_type: str
    confidence: float
    temporal_status: str
    roadwork_context: str
    evidence_reason: str
    provenance: str = ProvenanceEnum.DERIVED.value


class TrafficListResponse(BaseModel):
    """Response containing list of traffic records and pagination metadata."""
    meta: PaginationMeta
    data: List[TrafficRecord]
