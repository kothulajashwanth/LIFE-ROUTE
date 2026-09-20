"""Focused Test Suite for GET /api/network/nodes and regression checks.

Validates:
1. nodes.csv exists in dataset/raw/
2. total_nodes = 120
3. returned node count = 120
4. unique node IDs
5. latitude and longitude are valid numeric floats
6. no null coordinates
7. HTTP 200 response on GET /api/network/nodes
8. Provenance equals OBSERVED
9. Existing endpoints continue working:
   - GET /health
   - GET /api/dashboard/summary
   - GET /api/traffic/current
"""

import sys
from pathlib import Path
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config import settings


def test_network_nodes():
    print("=" * 70)
    print("LIFE ROUTE: NETWORK NODES API VALIDATION")
    print("=" * 70)

    # 1. Source dataset verification
    nodes_csv_path = settings.RAW_DATA_DIR / "nodes.csv"
    print(f"\n[1] Checking source dataset: {nodes_csv_path}")
    assert nodes_csv_path.exists(), f"nodes.csv not found at {nodes_csv_path}"
    print("  PASS: dataset/raw/nodes.csv exists.")

    client = TestClient(app)

    # 2. GET /api/network/nodes check
    print("\n[2] Testing GET /api/network/nodes...")
    response = client.get("/api/network/nodes")
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    print("  PASS: HTTP 200 returned.")

    data = response.json()
    assert "meta" in data, "Response missing 'meta'"
    assert "data" in data, "Response missing 'data'"
    assert "provenance" in data, "Response missing 'provenance'"
    assert data["provenance"] == "OBSERVED", f"Expected provenance OBSERVED, got {data['provenance']}"
    print("  PASS: Envelope contains meta, data, and provenance == OBSERVED.")

    # 3. Node count check
    meta = data["meta"]
    nodes = data["data"]
    assert meta["total_nodes"] == 120, f"Expected total_nodes=120, got {meta['total_nodes']}"
    assert meta["returned_nodes"] == 120, f"Expected returned_nodes=120, got {meta['returned_nodes']}"
    assert len(nodes) == 120, f"Expected 120 node items, got {len(nodes)}"
    print(f"  PASS: Exactly 120 nodes reported in meta and returned in data ({len(nodes)} nodes).")

    # 4. Unique node IDs
    node_ids = [n["node_id"] for n in nodes]
    assert len(set(node_ids)) == 120, f"Duplicate node_ids detected! Unique: {len(set(node_ids))}"
    assert node_ids[0] == "N001", f"Expected first node N001, got {node_ids[0]}"
    assert node_ids[-1] == "N120", f"Expected last node N120, got {node_ids[-1]}"
    print("  PASS: All 120 node IDs are unique (ranging from N001 to N120).")

    # 5. Numeric validation and bounds check
    for idx, node in enumerate(nodes):
        nid = node.get("node_id")
        lat = node.get("latitude")
        lon = node.get("longitude")
        assert nid is not None and isinstance(nid, str), f"Invalid node_id at index {idx}: {nid}"
        assert lat is not None and isinstance(lat, (int, float)), f"Null or non-numeric lat at {nid}: {lat}"
        assert lon is not None and isinstance(lon, (int, float)), f"Null or non-numeric lon at {nid}: {lon}"
        # Validate coordinates are in Hyderabad region (lat ~17, lon ~78)
        assert 17.0 <= lat <= 18.0, f"Latitude out of expected bounds for {nid}: {lat}"
        assert 78.0 <= lon <= 79.0, f"Longitude out of expected bounds for {nid}: {lon}"
    print("  PASS: All 120 nodes have valid, non-null numeric latitude and longitude coordinates.")

    # 6. Regression check: GET /health
    print("\n[3] Regression check: GET /health...")
    health_resp = client.get("/health")
    assert health_resp.status_code == 200, f"GET /health returned {health_resp.status_code}"
    assert health_resp.json().get("status") == "healthy"
    print("  PASS: GET /health is healthy.")

    # 7. Regression check: GET /api/dashboard/summary
    print("\n[4] Regression check: GET /api/dashboard/summary...")
    dash_resp = client.get("/api/dashboard/summary")
    assert dash_resp.status_code == 200, f"GET /api/dashboard/summary returned {dash_resp.status_code}"
    dash_data = dash_resp.json()
    assert dash_data["network_overview"]["total_nodes"] == 120
    assert dash_data["network_overview"]["total_segments"] == 436
    print("  PASS: GET /api/dashboard/summary returns intact network overview (120 nodes, 436 segments).")

    # 8. Regression check: GET /api/traffic/current
    print("\n[5] Regression check: GET /api/traffic/current...")
    traffic_resp = client.get("/api/traffic/current?limit=10")
    assert traffic_resp.status_code == 200, f"GET /api/traffic/current returned {traffic_resp.status_code}"
    traffic_data = traffic_resp.json()
    assert len(traffic_data["data"]) == 10
    print("  PASS: GET /api/traffic/current operates normally without regression.")

    print("\n" + "=" * 70)
    print("ALL TESTS PASSED: GET /api/network/nodes VERIFIED")
    print("=" * 70)
    return True


if __name__ == "__main__":
    try:
        success = test_network_nodes()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\nTEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
