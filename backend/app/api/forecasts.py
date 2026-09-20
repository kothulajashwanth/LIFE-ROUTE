"""Traffic forecasting endpoints."""

from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from backend.app.schemas.common import PaginationMeta
from backend.app.schemas.forecasts import ForecastListResponse, SegmentForecastDetail
from backend.app.services.data_service import data_service

router = APIRouter(prefix="/api/forecasts", tags=["Forecasting"])


@router.get("", response_model=ForecastListResponse)
def get_forecasts(
    limit: int = Query(50, ge=1, le=500, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    segment_id: Optional[str] = Query(None, description="Filter by segment ID"),
):
    """Retrieve causal multi-horizon forward speed predictions (15m, 30m, 45m, 60m)."""
    records, total = data_service.query_forecasts(
        limit=limit,
        offset=offset,
        segment_id=segment_id,
    )
    return ForecastListResponse(
        meta=PaginationMeta(
            total_records=total,
            returned_records=len(records),
            offset=offset,
            limit=limit,
        ),
        data=records,
    )


@router.get("/{segment_id}", response_model=SegmentForecastDetail)
def get_segment_forecast(segment_id: str):
    """Retrieve detailed forecast curve and 95% uncertainty bounds for a specific corridor."""
    detail = data_service.get_segment_forecast_detail(segment_id)
    if not detail:
        raise HTTPException(
            status_code=404,
            detail=f"Forecast records for segment '{segment_id}' not found.",
        )
    return detail
