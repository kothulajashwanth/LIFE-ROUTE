/**
 * Type definitions matching verified FastAPI backend schemas.
 */

export type ProvenanceType = "OBSERVED" | "DERIVED" | "SIMULATED";

export interface HealthResponse {
  status: string;
  app_name: string;
  version: string;
  supabase_configured: boolean;
  storage_mode: string;
}

export interface ApiError {
  error: string;
  detail?: string;
  code?: number;
}

export interface PaginationMeta {
  total_records: number;
  returned_records: number;
  offset: number;
  limit: number;
}
