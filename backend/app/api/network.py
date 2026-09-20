"""Network topology and geographic nodes endpoint."""

from fastapi import APIRouter
from backend.app.schemas.network import NodeListResponse, NodeMeta, NodeRecord
from backend.app.schemas.common import ProvenanceEnum
from backend.app.services.data_service import data_service

router = APIRouter(prefix="/api/network", tags=["Network"])


@router.get(
    "/nodes",
    response_model=NodeListResponse,
    summary="Get Network Node Coordinates",
    description="Returns organizer-provided geographic coordinates for network nodes.",
)
def get_network_nodes():
    """Returns organizer-provided geographic coordinates for network nodes."""
    nodes, total = data_service.get_network_nodes()
    return NodeListResponse(
        meta=NodeMeta(
            total_nodes=total,
            returned_nodes=len(nodes),
        ),
        data=[NodeRecord(**node) for node in nodes],
        provenance=ProvenanceEnum.OBSERVED,
    )
