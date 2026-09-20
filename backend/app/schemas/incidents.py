"""Schemas for Incident Intelligence API."""

from typing import List, Optional
from pydantic import BaseModel
from backend.app.schemas.common import PaginationMeta, ProvenanceEnum


class IncidentRecord(BaseModel):
    """Incident intelligence record."""
    timestamp: str
    segment_id: str
    source_node: Optional[str] = None
    target_node: Optional[str] = None
    
    # Incident classification
    incident_state: str
    matched_incident_id: Optional[str] = None
    incident_type: Optional[str] = None
    severity: int
    lanes_blocked: int
    incident_lifecycle: Optional[str] = None
    incident_confidence: float
    
    # Underlying traffic state
    speed_kmh: float
    flow_vph: float
    queue_length_veh: float
    congestion_state: str
    traffic_evidence: Optional[str] = None
    incident_reasoning: Optional[str] = None
    provenance: str = ProvenanceEnum.DERIVED.value


class IncidentListResponse(BaseModel):
    """List of incident intelligence records with metadata."""
    meta: PaginationMeta
    data: List[IncidentRecord]
