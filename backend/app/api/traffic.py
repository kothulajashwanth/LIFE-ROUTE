"""Traffic intelligence endpoints."""

from typing import Optional
from fastapi import APIRouter, Query
from backend.app.schemas.common import PaginationMeta
from backend.app.schemas.traffic import TrafficListResponse
from backend.app.services.data_service import data_service

router = APIRouter(prefix="/api/traffic", tags=["Traffic"])


@router.get("/current", response_model=TrafficListResponse)
def get_current_traffic(
    limit: int = Query(50, ge=1, le=500, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    segment_id: Optional[str] = Query(None, description="Filter by segment ID"),
    congestion_state: Optional[str] = Query(None, description="Filter by congestion state (NORMAL, WATCH, CONGESTED, SEVERE)"),
):
    """Retrieve current traffic intelligence across network segments."""
    records, total = data_service.query_traffic(
        limit=limit,
        offset=offset,
        segment_id=segment_id,
        congestion_state=congestion_state,
    )
    return TrafficListResponse(
        meta=PaginationMeta(
            total_records=total,
            returned_records=len(records),
            offset=offset,
            limit=limit,
        ),
        data=records,
    )
