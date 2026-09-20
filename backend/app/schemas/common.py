"""Common Pydantic models and Enums for LIFE-ROUTE Backend API."""

from enum import Enum
from typing import Optional, Any
from pydantic import BaseModel, Field


class ProvenanceEnum(str, Enum):
    """Data provenance classification."""
    OBSERVED = "OBSERVED"
    DERIVED = "DERIVED"
    SIMULATED = "SIMULATED"


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(..., example="healthy")
    app_name: str = Field(..., example="LIFE-ROUTE")
    version: str = Field(..., example="0.1.0")
    supabase_configured: bool = Field(..., example=True)
    storage_mode: str = Field(..., example="local_sqlite_fallback")


class PaginationMeta(BaseModel):
    """Pagination metadata for list endpoints."""
    total_records: int
    returned_records: int
    offset: int
    limit: int


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
    code: int = 400
