"""What-If Intervention Simulation endpoints."""

from fastapi import APIRouter, HTTPException
from backend.app.schemas.simulation import SimulationRunRequest, SimulationRunResponse
from backend.app.services.simulation_service import simulation_service

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])


@router.post("/run", response_model=SimulationRunResponse)
def run_simulation(payload: SimulationRunRequest):
    """Execute counterfactual intervention simulation using verified Step 8 implementation."""
    try:
        result = simulation_service.run_simulation(
            target_segment=payload.target_segment,
            candidate_id=payload.candidate_id,
            baseline_flow_vph=payload.baseline_flow_vph,
            baseline_observed_speed_kmh=payload.baseline_observed_speed_kmh,
            baseline_queue_veh=payload.baseline_queue_veh,
            scenario_id=payload.scenario_id or "USER_SIMULATION",
        )
        return SimulationRunResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Simulation execution error: {type(e).__name__}",
        )
