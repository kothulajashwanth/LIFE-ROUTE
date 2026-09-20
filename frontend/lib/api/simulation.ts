/**
 * Simulation API client connecting to FastAPI backend.
 * Endpoints:
 * - POST /api/simulation/run
 */

import { api } from "./client";
import {
  SimulationRunRequest,
  SimulationRunResponse,
} from "@/types/simulation";

/**
 * Execute What-If counterfactual intervention simulation (Step 8 verified engine).
 *
 * @param payload SimulationRunRequest with target_segment and candidate_id
 * @returns SimulationRunResponse with baseline, counterfactual, delta, and evidence
 */
export async function runSimulation(
  payload: SimulationRunRequest
): Promise<SimulationRunResponse> {
  return api.post<SimulationRunResponse>("/api/simulation/run", payload);
}
