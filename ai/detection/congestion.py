"""Multi-signal congestion classification module for LIFE-ROUTE.

Evaluates road segments into 4 transparent states:
- NORMAL: Flowing freely at or near free-flow speed
- WATCH: Initial performance deterioration or approaching capacity
- CONGESTED: Significant speed reduction, queues, and delay
- SEVERE: Severe breakdown, queue spillback, and heavy delay

Multi-signal methodology: Combines speed ratio, congestion index,
delay ratio, queue length, and capacity utilization.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd


@dataclass
class CongestionConfig:
    """Configurable thresholds for multi-signal congestion scoring."""

    # Speed ratio thresholds (speed / free_flow_speed)
    speed_watch_threshold: float = 0.75
    speed_congested_threshold: float = 0.50
    speed_severe_threshold: float = 0.30

    # Congestion index thresholds (0.0 to 1.0)
    ci_watch_threshold: float = 0.20
    ci_congested_threshold: float = 0.45
    ci_severe_threshold: float = 0.70

    # Delay ratio thresholds (delay / travel_time)
    delay_watch_threshold: float = 0.20
    delay_congested_threshold: float = 0.45
    delay_severe_threshold: float = 0.65

    # Capacity utilization thresholds (flow / capacity)
    util_watch_threshold: float = 0.80
    util_congested_threshold: float = 0.95

    # Overall multi-signal score thresholds for state assignment
    score_watch: float = 0.25
    score_congested: float = 0.50
    score_severe: float = 0.75


class CongestionClassifier:
    """Classifies road segment traffic conditions using multi-signal evidence."""

    STATES: List[str] = ["NORMAL", "WATCH", "CONGESTED", "SEVERE"]

    def __init__(self, config: Optional[CongestionConfig] = None) -> None:
        self.config = config or CongestionConfig()

    def compute_congestion_score(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Vectorized computation of continuous congestion score [0.0, 1.0] and state.

        Returns:
            Tuple of (congestion_scores: ndarray, congestion_states: ndarray)
        """
        n_rows = len(df)
        if n_rows == 0:
            return np.array([]), np.array([])

        cfg = self.config

        # 1. Speed ratio component (0 = full speed, 1 = total standstill)
        ff_speed = df["segment_free_flow_speed"].to_numpy(dtype=np.float32) if "segment_free_flow_speed" in df.columns else np.full(n_rows, 50.0, dtype=np.float32)
        ff_speed = np.clip(ff_speed, a_min=10.0, a_max=150.0)
        curr_speed = df["speed_kmh"].to_numpy(dtype=np.float32)
        speed_ratio = np.clip(curr_speed / ff_speed, a_min=0.0, a_max=1.5)
        speed_penalty = np.clip((1.0 - speed_ratio) / 0.75, a_min=0.0, a_max=1.0)

        # 2. Congestion index component (direct organizer sensor metric [0, 1])
        ci = df["congestion_index"].to_numpy(dtype=np.float32) if "congestion_index" in df.columns else np.zeros(n_rows, dtype=np.float32)
        ci_component = np.clip(ci, a_min=0.0, a_max=1.0)

        # 3. Delay ratio component (delay / travel_time)
        if "delay_ratio" in df.columns:
            delay_comp = np.clip(df["delay_ratio"].to_numpy(dtype=np.float32), a_min=0.0, a_max=1.0)
        else:
            delay_comp = np.zeros(n_rows, dtype=np.float32)

        # 4. Queue component (queue length scaled)
        if "queue_length_veh" in df.columns:
            q = df["queue_length_veh"].to_numpy(dtype=np.float32)
            queue_comp = np.clip(q / 30.0, a_min=0.0, a_max=1.0)
        else:
            queue_comp = np.zeros(n_rows, dtype=np.float32)

        # 5. Capacity utilization component
        if "capacity_utilization" in df.columns:
            util = df["capacity_utilization"].to_numpy(dtype=np.float32)
            util_comp = np.clip((util - 0.70) / 0.40, a_min=0.0, a_max=1.0)
        else:
            util_comp = np.zeros(n_rows, dtype=np.float32)

        # Weighted multi-signal fusion:
        # Speed deterioration: 35%, Congestion Index: 30%, Delay: 15%, Queue: 10%, Capacity: 10%
        scores = (
            0.35 * speed_penalty
            + 0.30 * ci_component
            + 0.15 * delay_comp
            + 0.10 * queue_comp
            + 0.10 * util_comp
        ).astype(np.float32)

        # Ensure strict bounds [0.0, 1.0]
        scores = np.clip(scores, a_min=0.0, a_max=1.0)

        # Assign discrete states based on calibrated thresholds
        states = np.full(n_rows, "NORMAL", dtype=object)
        states[scores >= cfg.score_watch] = "WATCH"
        states[scores >= cfg.score_congested] = "CONGESTED"
        states[scores >= cfg.score_severe] = "SEVERE"

        return scores, states
