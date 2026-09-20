"""API routers package for LIFE-ROUTE Backend."""

from backend.app.api.health import router as health_router
from backend.app.api.dashboard import router as dashboard_router
from backend.app.api.traffic import router as traffic_router
from backend.app.api.incidents import router as incidents_router
from backend.app.api.forecasts import router as forecasts_router
from backend.app.api.propagation import router as propagation_router
from backend.app.api.recommendations import router as recommendations_router
from backend.app.api.simulation import router as simulation_router
from backend.app.api.network import router as network_router

__all__ = [
    "health_router",
    "dashboard_router",
    "traffic_router",
    "incidents_router",
    "forecasts_router",
    "propagation_router",
    "recommendations_router",
    "simulation_router",
    "network_router",
]
