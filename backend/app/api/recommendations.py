"""Decision and recommendation engine endpoints."""

from typing import Optional
from fastapi import APIRouter, Query
from backend.app.schemas.common import PaginationMeta
from backend.app.schemas.recommendations import RecommendationListResponse
from backend.app.services.data_service import data_service

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])


@router.get("", response_model=RecommendationListResponse)
def get_recommendations(
    limit: int = Query(50, ge=1, le=500, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    tier: Optional[str] = Query(None, description="Filter by tier (TACTICAL_OPERATIONAL, STRATEGIC_CAPITAL)"),
    urgency: Optional[str] = Query(None, description="Filter by urgency (CRITICAL, HIGH, MEDIUM, ADVISORY)"),
    target_segment: Optional[str] = Query(None, description="Filter by target segment ID"),
):
    """Retrieve decision engine recommendations across tactical and strategic horizons."""
    records, total = data_service.query_recommendations(
        limit=limit,
        offset=offset,
        tier=tier,
        urgency=urgency,
        target_segment=target_segment,
    )
    return RecommendationListResponse(
        meta=PaginationMeta(
            total_records=total,
            returned_records=len(records),
            offset=offset,
            limit=limit,
        ),
        data=records,
    )
