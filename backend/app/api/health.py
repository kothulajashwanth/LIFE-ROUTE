"""Health check and service status endpoints."""

from fastapi import APIRouter
from backend.app.config import settings
from backend.app.schemas.common import HealthResponse
from backend.app.services.supabase_service import supabase_service

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def health_check():
    """Health probe verifying that FastAPI backend is online."""
    status_info = supabase_service.get_status()
    return HealthResponse(
        status="healthy",
        app_name=settings.APP_NAME,
        version="0.1.0",
        supabase_configured=status_info["configured"],
        storage_mode=status_info["storage_mode"],
    )


@router.get("/api/health/supabase")
def supabase_health():
    """Detailed Supabase connection check (never exposes secret keys)."""
    return supabase_service.get_status()
