"""Directed Road Network Graph for LIFE-ROUTE.

Represents the urban transport network as a Directed Graph:
- Nodes: Intersections (N001 to N120) with spatial coordinates
- Directed Edges: Road segments (R0001 to R0436) with physical and capacity attributes
- Signal Plans: Intersections with signal timings and green ratios
- Turn Restrictions: Hard geometric constraints pruning illegal turns
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
import pandas as pd


@dataclass
class RoadSegmentInfo:
    """Static attributes for a single directed road segment."""

    segment_id: str
    source_node: str
    target_node: str
    road_class: str
    lanes: int
    free_flow_speed_kmh: float
    capacity_vph: float
    length_km: float
    grade_pct: float
    signal_id: Optional[str]
    green_ratio: float
    is_structural_bottleneck: bool
    importance: float
    peak_capacity_factor: float
    storage_capacity_veh: float


class RoadNetworkGraph:
    """Directed graph representing intersections, directional links, and restrictions."""

    # Default traffic engineering assumption for jam density (veh/km/lane)
    K_JAM_DEFAULT: float = 130.0

    def __init__(
        self,
        network_path: Path = Path("dataset/raw/network.csv"),
        nodes_path: Path = Path("dataset/raw/nodes.csv"),
        signals_path: Path = Path("dataset/raw/signal_plans.csv"),
        restrictions_path: Path = Path("dataset/raw/turn_restrictions.csv"),
        k_jam: float = K_JAM_DEFAULT,
    ) -> None:
        self.k_jam = k_jam
        self.segments: Dict[str, RoadSegmentInfo] = {}
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.signal_plans: Dict[str, Dict[str, Any]] = {}
        self.turn_restrictions: Set[Tuple[str, str]] = set()

        # Adjacency structures
        self.downstream_adj: Dict[str, List[str]] = {}
        self.upstream_adj: Dict[str, List[str]] = {}

        self._build_graph(network_path, nodes_path, signals_path, restrictions_path)

    def _build_graph(
        self,
        network_path: Path,
        nodes_path: Path,
        signals_path: Path,
        restrictions_path: Path,
    ) -> None:
        """Construct graph topology and apply turn restrictions."""
        # 1. Load nodes
        nodes_df = pd.read_csv(nodes_path)
        for _, row in nodes_df.iterrows():
            self.nodes[str(row["node_id"])] = {
                "x": float(row.get("x", 0.0)),
                "y": float(row.get("y", 0.0)),
                "lat": float(row.get("lat", 0.0)),
                "lon": float(row.get("lon", 0.0)),
            }

        # 2. Load signal plans
        signals_df = pd.read_csv(signals_path)
        for _, row in signals_df.iterrows():
            self.signal_plans[str(row["signal_id"])] = {
                "node_id": str(row["node_id"]),
                "cycle_s": float(row["cycle_s"]),
                "green_ratio": float(row["green_ratio"]),
                "offset_s": float(row.get("offset_s", 0.0)),
            }

        # 3. Load turn restrictions (prune physically prohibited turns)
        restrictions_df = pd.read_csv(restrictions_path)
        for _, row in restrictions_df.iterrows():
            from_seg = str(row["from_segment"])
            to_seg = str(row["to_segment"])
            # Record prohibited movement
            self.turn_restrictions.add((from_seg, to_seg))

        # 4. Load segments and physical properties
        net_df = pd.read_csv(network_path)
        node_outgoing: Dict[str, List[str]] = {}
        node_incoming: Dict[str, List[str]] = {}

        for _, row in net_df.iterrows():
            seg_id = str(row["segment_id"])
            src = str(row["source_node"])
            tgt = str(row["target_node"])
            lanes = int(row.get("lanes", 2))
            length_km = float(row.get("length_km", 1.0))
            cap = float(row.get("capacity_vph", 1800.0))
            ff_speed = float(row.get("free_flow_speed_kmh", 50.0))

            sig_id = str(row["signal_id"]) if pd.notna(row.get("signal_id")) else None
            # Default green ratio is 1.0 if unsignalized, otherwise lookup from signal_plans
            g_ratio = 1.0
            if sig_id and sig_id in self.signal_plans:
                g_ratio = self.signal_plans[sig_id]["green_ratio"]

            storage = length_km * lanes * self.k_jam

            self.segments[seg_id] = RoadSegmentInfo(
                segment_id=seg_id,
                source_node=src,
                target_node=tgt,
                road_class=str(row.get("road_class", "collector")),
                lanes=lanes,
                free_flow_speed_kmh=ff_speed,
                capacity_vph=cap,
                length_km=length_km,
                grade_pct=float(row.get("grade_pct", 0.0)),
                signal_id=sig_id,
                green_ratio=g_ratio,
                is_structural_bottleneck=bool(row.get("structural_bottleneck", 0) == 1),
                importance=float(row.get("importance", 1.0)),
                peak_capacity_factor=float(row.get("peak_capacity_factor", 1.0)),
                storage_capacity_veh=storage,
            )

            # Track node links
            node_outgoing.setdefault(src, []).append(seg_id)
            node_incoming.setdefault(tgt, []).append(seg_id)
            self.downstream_adj[seg_id] = []
            self.upstream_adj[seg_id] = []

        # 5. Connect downstream and upstream links with turn restriction pruning
        for seg_id, seg_info in self.segments.items():
            # Downstream segments exit from target_node
            for out_seg in node_outgoing.get(seg_info.target_node, []):
                if out_seg != seg_id:
                    # Enforce turn restriction check
                    if (seg_id, out_seg) not in self.turn_restrictions:
                        self.downstream_adj[seg_id].append(out_seg)

            # Upstream segments enter into source_node
            for in_seg in node_incoming.get(seg_info.source_node, []):
                if in_seg != seg_id:
                    # Enforce turn restriction check (in_seg cannot feed seg_id if restricted)
                    if (in_seg, seg_id) not in self.turn_restrictions:
                        self.upstream_adj[seg_id].append(in_seg)

    def get_segment(self, segment_id: str) -> Optional[RoadSegmentInfo]:
        """Retrieve segment attributes."""
        return self.segments.get(segment_id)

    def get_downstream_segments(self, segment_id: str) -> List[str]:
        """Get legal downstream outgoing segments."""
        return self.downstream_adj.get(segment_id, [])

    def get_upstream_segments(self, segment_id: str) -> List[str]:
        """Get legal upstream feeding segments."""
        return self.upstream_adj.get(segment_id, [])
