"""Incident intelligence endpoints."""

from typing import Optional
from fastapi import APIRouter, Query
from backend.app.schemas.common import PaginationMeta
from backend.app.schemas.incidents import IncidentListResponse
from backend.app.services.data_service import data_service

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])


@router.get("", response_model=IncidentListResponse)
def get_incidents(
    limit: int = Query(50, ge=1, le=500, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    incident_state: Optional[str] = Query(None, description="Filter by state (INCIDENT_SUPPORTED, ROADWORK_SUPPORTED, etc.)"),
    severity: Optional[int] = Query(None, ge=0, le=3, description="Filter by severity level (1-3)"),
):
    """Retrieve verified incident intelligence and traffic alignment records."""
    records, total = data_service.query_incidents(
        limit=limit,
        offset=offset,
        incident_state=incident_state,
        severity=severity,
    )
    return IncidentListResponse(
        meta=PaginationMeta(
            total_records=total,
            returned_records=len(records),
            offset=offset,
            limit=limit,
        ),
        data=records,
    )
