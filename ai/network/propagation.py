"""Network Propagation Engine for LIFE-ROUTE.

Traverses directed road network graph to identify:
1. Upstream queue spillback across feeder links (primary bottleneck impact)
2. Downstream flow starvation (throttled throughput)
3. Multi-hop reachability up to K=3 hops
4. Time-to-impact horizons (15m, 30m, 45m, 60m)
5. Explainable propagation risk scores
"""

from collections import deque
from dataclasses import asdict, dataclass
import logging
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np
import pandas as pd

from ai.network.graph import RoadNetworkGraph, RoadSegmentInfo
from ai.network.scoring import PropagationScorer

logger = logging.getLogger(__name__)


@dataclass
class PropagationEvent:
    """Represents a single spatial propagation record."""

    timestamp: str
    seed_segment_id: str
    propagated_segment_id: str
    direction: str  # 'UPSTREAM_SPILLBACK' or 'DOWNSTREAM_STARVATION'
    hops: int
    horizon_min: int
    propagation_score: float
    risk_level: str
    evidence_reason: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class NetworkPropagationEngine:
    """Engine executing graph-constrained network propagation from bottleneck seeds."""

    MAX_HOPS: int = 3

    def __init__(self, graph: Optional[RoadNetworkGraph] = None) -> None:
        self.graph = graph or RoadNetworkGraph()
        self.scorer = PropagationScorer()

    def identify_seeds(
        self,
        detections_df: pd.DataFrame,
        forecasts_df: Optional[pd.DataFrame] = None,
    ) -> pd.DataFrame:
        """Identify propagation bottleneck seeds based on Step 4/5 state, queue, and Step 6 forecasts.

        Seed Criteria:
        1. Step 4/5 indicates CONGESTED or SEVERE, OR
        2. Step 6 forecast predicts pred_speed_15m < 0.50 * free_flow_speed, OR
        3. Current queue length >= 15 vehicles.
        """
        df = detections_df.copy()

        # Merge Step 6 forecast if provided
        if forecasts_df is not None:
            cols = ["timestamp", "segment_id", "pred_speed_15m"]
            avail_cols = [c for c in cols if c in forecasts_df.columns]
            df = df.merge(forecasts_df[avail_cols], on=["timestamp", "segment_id"], how="left")

        # Free-flow speeds
        ff_map = {sid: s.free_flow_speed_kmh for sid, s in self.graph.segments.items()}
        df["free_flow_speed"] = df["segment_id"].map(ff_map).fillna(50.0)

        # 1. Congestion state check
        cond_congested = df["congestion_state"].isin(["CONGESTED", "SEVERE"])

        # 2. Predicted breakdown check
        if "pred_speed_15m" in df.columns:
            cond_pred_breakdown = df["pred_speed_15m"] < (0.50 * df["free_flow_speed"])
        else:
            cond_pred_breakdown = pd.Series(False, index=df.index)

        # 3. Queue threshold check
        q_col = "queue_length_veh" if "queue_length_veh" in df.columns else "queue_length"
        if q_col in df.columns:
            cond_queue = df[q_col] >= 15.0
        else:
            cond_queue = pd.Series(False, index=df.index)

        seed_mask = cond_congested | cond_pred_breakdown | cond_queue
        seeds_df = df[seed_mask].copy()

        # Record why each seed was selected
        reasons = []
        for _, r in seeds_df.iterrows():
            r_parts = []
            if r["congestion_state"] in ["CONGESTED", "SEVERE"]:
                r_parts.append(f"state={r['congestion_state']}")
            if cond_pred_breakdown.loc[r.name]:
                r_parts.append(f"pred_speed_15m={r.get('pred_speed_15m', 0.0):.1f}km/h")
            if cond_queue.loc[r.name]:
                r_parts.append(f"queue={r.get(q_col, 0.0):.1f}veh")
            reasons.append("; ".join(r_parts))

        seeds_df["seed_reason"] = reasons
        logger.info("Identified %d propagation seeds across %d records.", len(seeds_df), len(df))
        return seeds_df

    def propagate_timestamp(
        self,
        timestamp: str,
        timestamp_seeds: pd.DataFrame,
        traffic_snapshot: pd.DataFrame,
    ) -> List[PropagationEvent]:
        """Perform multi-hop traversal for all seeds active at a single timestamp."""
        events: List[PropagationEvent] = []

        # Fast lookup maps for traffic values at this timestamp
        flow_map = traffic_snapshot.set_index("segment_id")["flow_vph"].to_dict() if "flow_vph" in traffic_snapshot.columns else {}
        queue_map = traffic_snapshot.set_index("segment_id")["queue_length_veh"].to_dict() if "queue_length_veh" in traffic_snapshot.columns else {}
        score_map = traffic_snapshot.set_index("segment_id")["congestion_score"].to_dict() if "congestion_score" in traffic_snapshot.columns else {}

        for _, seed in timestamp_seeds.iterrows():
            seed_id = str(seed["segment_id"])
            seed_info = self.graph.get_segment(seed_id)
            if not seed_info:
                continue

            s_seed = float(score_map.get(seed_id, 0.65))
            q_seed = float(queue_map.get(seed_id, 15.0))
            seed_storage = seed_info.storage_capacity_veh

            # =========================================================
            # 1. UPSTREAM QUEUE SPILLBACK (BFS traversal up to K=3 hops)
            # =========================================================
            # Queue stores: (current_segment_id, hop_count, cumulative_distance_km, branch_visited)
            queue: deque = deque([(seed_id, 0, 0.0, {seed_id})])

            while queue:
                curr_id, hop, cum_dist, visited = queue.popleft()

                if hop >= self.MAX_HOPS:
                    continue

                upstream_neighbors = self.graph.get_upstream_segments(curr_id)
                for up_id in upstream_neighbors:
                    if up_id in visited:
                        continue  # Cycle prevention

                    up_info = self.graph.get_segment(up_id)
                    if not up_info:
                        continue

                    new_hop = hop + 1
                    new_dist = cum_dist + up_info.length_km
                    horizon = self.scorer.estimate_horizon(new_dist)

                    up_flow = float(flow_map.get(up_id, 0.8 * up_info.capacity_vph))
                    is_sig = up_info.signal_id is not None

                    p_score, risk_lvl = self.scorer.compute_propagation_score(
                        s_seed=s_seed,
                        hop=new_hop,
                        flow_feeder=up_flow,
                        capacity_feeder=up_info.capacity_vph,
                        is_signalized=is_sig,
                        green_ratio=up_info.green_ratio,
                    )

                    spill_risk = self.scorer.compute_spillback_risk(
                        q_seed=q_seed,
                        storage_seed=seed_storage,
                        flow_upstream=up_flow,
                        capacity_upstream=up_info.capacity_vph,
                        green_ratio_upstream=up_info.green_ratio,
                    )

                    evidence = (
                        f"hop={new_hop}; upstream_feeder; seed_queue={q_seed:.1f}veh; "
                        f"storage_seed={seed_storage:.0f}veh; feeder_util={up_flow/up_info.capacity_vph:.2f}; "
                        f"spillback_factor={spill_risk:.2f}; est_horizon={horizon}m"
                    )

                    events.append(
                        PropagationEvent(
                            timestamp=timestamp,
                            seed_segment_id=seed_id,
                            propagated_segment_id=up_id,
                            direction="UPSTREAM_SPILLBACK",
                            hops=new_hop,
                            horizon_min=horizon,
                            propagation_score=p_score,
                            risk_level=risk_lvl,
                            evidence_reason=evidence,
                        )
                    )

                    new_visited = set(visited)
                    new_visited.add(up_id)
                    queue.append((up_id, new_hop, new_dist, new_visited))

            # =========================================================
            # 2. DOWNSTREAM FLOW STARVATION (Immediate exiting links)
            # =========================================================
            downstream_neighbors = self.graph.get_downstream_segments(seed_id)
            for down_id in downstream_neighbors:
                down_info = self.graph.get_segment(down_id)
                if not down_info:
                    continue

                down_dist = down_info.length_km
                horizon = self.scorer.estimate_horizon(down_dist)
                starvation_score = round(float(np.clip(s_seed * 0.75, 0.0, 1.0)), 4)

                events.append(
                    PropagationEvent(
                        timestamp=timestamp,
                        seed_segment_id=seed_id,
                        propagated_segment_id=down_id,
                        direction="DOWNSTREAM_STARVATION",
                        hops=1,
                        horizon_min=horizon,
                        propagation_score=starvation_score,
                        risk_level="MODERATE_PROPAGATION" if starvation_score >= 0.30 else "LOW_RISK",
                        evidence_reason=(
                            f"hop=1; downstream_exit; choked_inflow_from_seed={seed_id}; "
                            f"reduced_throughput_capacity={down_info.capacity_vph:.0f}vph"
                        ),
                    )
                )

        return events

    def run_propagation_pipeline(
        self,
        detections_df: pd.DataFrame,
        forecasts_df: Optional[pd.DataFrame] = None,
        max_timestamps: Optional[int] = None,
    ) -> pd.DataFrame:
        """Execute propagation analysis across all timestamps in the dataset."""
        logger.info("Executing network propagation pipeline...")
        seeds_df = self.identify_seeds(detections_df, forecasts_df)

        if len(seeds_df) == 0:
            logger.warning("No propagation seeds identified.")
            return pd.DataFrame(columns=[
                "timestamp", "seed_segment_id", "propagated_segment_id",
                "direction", "hops", "horizon_min", "propagation_score",
                "risk_level", "evidence_reason"
            ])

        # Group by timestamp to evaluate temporal network states
        timestamps = seeds_df["timestamp"].drop_duplicates().tolist()
        if max_timestamps is not None:
            timestamps = timestamps[:max_timestamps]

        all_events: List[PropagationEvent] = []
        det_indexed = detections_df.set_index("timestamp")

        for ts in timestamps:
            ts_seeds = seeds_df[seeds_df["timestamp"] == ts]
            # Get traffic snapshot at this timestamp
            if ts in det_indexed.index:
                snapshot = det_indexed.loc[[ts]].reset_index()
            else:
                snapshot = ts_seeds

            ts_events = self.propagate_timestamp(
                timestamp=str(ts),
                timestamp_seeds=ts_seeds,
                traffic_snapshot=snapshot,
            )
            all_events.extend(ts_events)

        logger.info("Generated %d propagation events.", len(all_events))
        return pd.DataFrame([e.to_dict() for e in all_events])
