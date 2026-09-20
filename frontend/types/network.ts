/**
 * Network topology and node coordinates types.
 * Matches backend GET /api/network/nodes response.
 */

import { ProvenanceType } from "./api";

export interface NodeRecord {
  node_id: string;
  latitude: number;
  longitude: number;
}

export interface NodeListResponse {
  meta: {
    total_nodes: number;
    returned_nodes: number;
  };
  data: NodeRecord[];
  provenance: ProvenanceType | string;
}
