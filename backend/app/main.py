"""FastAPI Application Entrypoint for LIFE-ROUTE.

Connects the verified AI intelligence pipeline (Steps 1-9) to standard RESTful APIs.
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.config import settings
from backend.app.api import (
    health_router,
    dashboard_router,
    traffic_router,
    incidents_router,
    forecasts_router,
    propagation_router,
    recommendations_router,
    simulation_router,
    network_router,
)

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for LIFE-ROUTE urban traffic intelligence, emergency routing, and counterfactual simulation.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Mount all feature routers
app.include_router(health_router)
app.include_router(dashboard_router)
app.include_router(traffic_router)
app.include_router(incidents_router)
app.include_router(forecasts_router)
app.include_router(propagation_router)
app.include_router(recommendations_router)
app.include_router(simulation_router)
app.include_router(network_router)


@app.get("/")
def read_root():
    """Root metadata endpoint."""
    return {
        "name": settings.APP_NAME,
        "status": "online",
        "version": "0.1.0",
        "docs_url": "/docs",
        "endpoints": [
            "/health",
            "/api/dashboard/summary",
            "/api/traffic/current",
            "/api/incidents",
            "/api/forecasts",
            "/api/propagation",
            "/api/recommendations",
            "/api/simulation/run",
            "/api/network/nodes",
        ],
    }


# Standardized exception handler to prevent leaking internal tracebacks
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": f"An unexpected error occurred: {type(exc).__name__}",
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=(settings.APP_ENV == "development"),
    )
