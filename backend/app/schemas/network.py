"""Schemas for Network Topology and Geographic Coordinates API."""

from typing import List
from pydantic import BaseModel, Field
from backend.app.schemas.common import ProvenanceEnum


class NodeMeta(BaseModel):
    """Metadata for node listing."""
    total_nodes: int = Field(..., example=120, description="Total count of nodes in the organizer dataset")
    returned_nodes: int = Field(..., example=120, description="Count of nodes returned in the payload")


class NodeRecord(BaseModel):
    """Geographic coordinate record for a network node from organizer nodes.csv."""
    node_id: str = Field(..., example="N001", description="Unique identifier for the network node")
    latitude: float = Field(..., example=17.300, description="Geographic latitude coordinate")
    longitude: float = Field(..., example=78.350, description="Geographic longitude coordinate")


class NodeListResponse(BaseModel):
    """API response envelope for GET /api/network/nodes."""
    meta: NodeMeta
    data: List[NodeRecord]
    provenance: ProvenanceEnum = Field(ProvenanceEnum.OBSERVED, example=ProvenanceEnum.OBSERVED)
