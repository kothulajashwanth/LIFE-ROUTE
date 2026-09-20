import { api } from "./client";
import { NodeListResponse } from "@/types/network";

/**
 * Fetch organizer node geographic coordinates from FastAPI.
 * GET /api/network/nodes
 */
export async function getNetworkNodes(): Promise<NodeListResponse> {
  return api.get<NodeListResponse>("/api/network/nodes");
}
