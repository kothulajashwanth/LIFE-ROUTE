"""Dashboard command center endpoints."""

from fastapi import APIRouter
from backend.app.schemas.dashboard import DashboardSummaryResponse
from backend.app.services.data_service import data_service

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary():
    """Retrieve high-level network command center summary derived from real pipeline artifacts."""
    return data_service.get_dashboard_summary()
