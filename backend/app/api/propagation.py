"""Network propagation and spillback intelligence endpoints."""

from typing import Optional
from fastapi import APIRouter, Query
from backend.app.schemas.common import PaginationMeta
from backend.app.schemas.propagation import PropagationListResponse
from backend.app.services.data_service import data_service

router = APIRouter(prefix="/api/propagation", tags=["Propagation"])


@router.get("", response_model=PropagationListResponse)
def get_propagation(
    limit: int = Query(50, ge=1, le=500, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    seed_segment_id: Optional[str] = Query(None, description="Filter by bottleneck seed segment"),
    risk_level: Optional[str] = Query(None, description="Filter by risk band (HIGH_SPILLBACK_IMPACT, MODERATE_PROPAGATION, LOW_RISK)"),
):
    """Retrieve multi-hop queue spillback and downstream starvation footprints."""
    records, total = data_service.query_propagation(
        limit=limit,
        offset=offset,
        seed_segment_id=seed_segment_id,
        risk_level=risk_level,
    )
    return PropagationListResponse(
        meta=PaginationMeta(
            total_records=total,
            returned_records=len(records),
            offset=offset,
            limit=limit,
        ),
        data=records,
    )
