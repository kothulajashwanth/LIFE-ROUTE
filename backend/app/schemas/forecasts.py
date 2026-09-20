"""Schemas for Traffic Forecasting API."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from backend.app.schemas.common import PaginationMeta, ProvenanceEnum


class ForecastRecord(BaseModel):
    """Multi-horizon forecast summary record."""
    timestamp: str
    segment_id: str
    current_speed_kmh: float
    pred_speed_15m: float
    pred_travel_time_15m_min: float
    pred_congestion_state_15m: str
    pred_speed_30m: float
    pred_speed_45m: float
    pred_speed_60m: float
    provenance: str = ProvenanceEnum.DERIVED.value


class SegmentForecastDetail(BaseModel):
    """Detailed forecast timeline with uncertainty bounds for a single segment."""
    timestamp: str
    segment_id: str
    current_speed_kmh: float
    horizons: Dict[str, Dict[str, Any]]
    provenance: str = ProvenanceEnum.DERIVED.value


class ForecastListResponse(BaseModel):
    """List of segment forecasts."""
    meta: PaginationMeta
    data: List[ForecastRecord]
