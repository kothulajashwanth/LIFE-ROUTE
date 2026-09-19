"""Anomaly detection module for LIFE-ROUTE traffic intelligence.

Identifies abnormal traffic behaviors using robust statistical deviations
and sudden step-change dynamics relative to recent historical baselines.

Supported Anomaly Taxonomies:
- SPEED_DROP: Sudden deceleration or extreme z-score drop vs 1-hour mean
- FLOW_SURGE: Sudden volume surge beyond typical flow variations
- FLOW_DROP: Sudden volume collapse under high occupancy/slowdown
- OCCUPANCY_SPIKE: Sudden spike in lane occupancy percentage
- QUEUE_GROWTH: Rapid accumulation of queued vehicles
- CONGESTION_SURGE: Rapid jump in congestion index
- MULTI_SIGNAL_ANOMALY: Multiple corroborating abnormal signals
- NONE: Behavior conforms to standard patterns
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd


@dataclass
class AnomalyConfig:
    """Configurable sensitivity thresholds for anomaly identification."""

    # Robust z-score threshold for speed deviation vs 60m rolling baseline
    speed_z_threshold: float = -2.5
    # Step-change drops over 5-minute interval
    speed_step_drop_threshold: float = -15.0  # km/h
    # Step-change surges
    flow_surge_threshold: float = 800.0       # vph
    flow_drop_threshold: float = -800.0       # vph
    occupancy_spike_threshold: float = 20.0   # %
    queue_growth_threshold: float = 8.0       # vehicles
    congestion_surge_threshold: float = 0.25  # index delta


class AnomalyDetector:
    """Detects and categorizes abnormal traffic behaviors using multi-signal evidence."""

    ANOMALY_TYPES: List[str] = [
        "NONE",
        "SPEED_DROP",
        "FLOW_SURGE",
        "FLOW_DROP",
        "OCCUPANCY_SPIKE",
        "QUEUE_GROWTH",
        "CONGESTION_SURGE",
        "MULTI_SIGNAL_ANOMALY",
    ]

    def __init__(self, config: Optional[AnomalyConfig] = None) -> None:
        self.config = config or AnomalyConfig()

    def detect_anomalies(
        self, df: pd.DataFrame
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, List[str]]:
        """Vectorized detection of abnormal traffic conditions.

        Returns:
            Tuple of:
            - is_anomaly (bool ndarray)
            - anomaly_types (str ndarray)
            - anomaly_confidences (float ndarray in [0, 1])
            - evidence_reasons (list of str descriptions)
        """
        n_rows = len(df)
        if n_rows == 0:
            return np.array([]), np.array([]), np.array([]), []

        cfg = self.config

        # 1. Speed deviation z-score: (speed - rolling_mean) / max(rolling_std, 2.0)
        speed = df["speed_kmh"].to_numpy(dtype=np.float32)
        mean_speed = (
            df["speed_rolling_mean_60m"].to_numpy(dtype=np.float32)
            if "speed_rolling_mean_60m" in df.columns
            else speed
        )
        std_speed = (
            df["speed_rolling_std_60m"].to_numpy(dtype=np.float32)
            if "speed_rolling_std_60m" in df.columns
            else np.full(n_rows, 5.0, dtype=np.float32)
        )
        std_speed = np.clip(std_speed, a_min=2.0, a_max=50.0)
        z_speed = (speed - mean_speed) / std_speed

        # 2. Step change metrics (5-minute differences)
        d_speed = (
            df["speed_change_5m"].to_numpy(dtype=np.float32)
            if "speed_change_5m" in df.columns
            else np.zeros(n_rows, dtype=np.float32)
        )
        d_flow = (
            df["flow_change_5m"].to_numpy(dtype=np.float32)
            if "flow_change_5m" in df.columns
            else np.zeros(n_rows, dtype=np.float32)
        )
        d_occ = (
            df["occupancy_change_5m"].to_numpy(dtype=np.float32)
            if "occupancy_change_5m" in df.columns
            else np.zeros(n_rows, dtype=np.float32)
        )
        d_queue = (
            df["queue_growth_5m"].to_numpy(dtype=np.float32)
            if "queue_growth_5m" in df.columns
            else np.zeros(n_rows, dtype=np.float32)
        )
        d_cong = (
            df["congestion_change_5m"].to_numpy(dtype=np.float32)
            if "congestion_change_5m" in df.columns
            else np.zeros(n_rows, dtype=np.float32)
        )

        sensor_quality = (
            df["sensor_quality"].to_numpy(dtype=np.float32)
            if "sensor_quality" in df.columns
            else np.ones(n_rows, dtype=np.float32)
        )
        sensor_quality = np.clip(sensor_quality, a_min=0.1, a_max=1.0)

        # 3. Boolean anomaly signal triggers
        trig_speed_drop = (z_speed < cfg.speed_z_threshold) | (d_speed < cfg.speed_step_drop_threshold)
        trig_flow_surge = d_flow > cfg.flow_surge_threshold
        trig_flow_drop = (d_flow < cfg.flow_drop_threshold) & (z_speed < -1.0)
        trig_occ_spike = d_occ > cfg.occupancy_spike_threshold
        trig_queue_growth = d_queue >= cfg.queue_growth_threshold
        trig_cong_surge = d_cong >= cfg.congestion_surge_threshold

        # Stack triggers to count concurring abnormal signals
        trigger_matrix = np.column_stack([
            trig_speed_drop,
            trig_flow_surge,
            trig_flow_drop,
            trig_occ_spike,
            trig_queue_growth,
            trig_cong_surge,
        ])
        signal_counts = trigger_matrix.sum(axis=1)

        is_anomaly = signal_counts > 0

        # 4. Determine Anomaly Classification
        anomaly_types = np.full(n_rows, "NONE", dtype=object)

        # Multi-signal anomaly when 2+ indicators concur
        multi_mask = signal_counts >= 2
        anomaly_types[multi_mask] = "MULTI_SIGNAL_ANOMALY"

        # Single-signal categorization when exactly 1 indicator triggers
        single_mask = signal_counts == 1
        anomaly_types[single_mask & trig_speed_drop] = "SPEED_DROP"
        anomaly_types[single_mask & trig_flow_surge] = "FLOW_SURGE"
        anomaly_types[single_mask & trig_flow_drop] = "FLOW_DROP"
        anomaly_types[single_mask & trig_occ_spike] = "OCCUPANCY_SPIKE"
        anomaly_types[single_mask & trig_queue_growth] = "QUEUE_GROWTH"
        anomaly_types[single_mask & trig_cong_surge] = "CONGESTION_SURGE"

        # 5. Calculate Interpretable Confidence [0.0, 1.0]
        # Base confidence scales with evidence agreement and magnitude of speed deviation, modulated by sensor quality
        raw_confidence = np.full(n_rows, 0.85, dtype=np.float32)  # High confidence in normal state
        if np.any(is_anomaly):
            # Anomaly confidence increases with corroborating signals and z-score severity
            sev = np.clip(np.abs(z_speed) / 4.0, a_min=0.0, a_max=1.0)
            anomaly_conf = 0.50 + 0.15 * signal_counts + 0.20 * sev
            raw_confidence[is_anomaly] = np.clip(anomaly_conf[is_anomaly], a_min=0.50, a_max=1.0)

        # Scale by sensor health
        confidences = np.clip(raw_confidence * sensor_quality, a_min=0.0, a_max=1.0).astype(np.float32)

        # 6. Construct Explainability Evidence
        evidence_reasons: List[str] = []
        # Pre-format frequent standard reason
        standard_reason = "Standard flow within historical bounds"
        for i in range(n_rows):
            if not is_anomaly[i]:
                evidence_reasons.append(standard_reason)
            else:
                triggers = []
                if trig_speed_drop[i]:
                    triggers.append(f"speed_drop(z={z_speed[i]:.2f},d={d_speed[i]:.1f})")
                if trig_flow_surge[i]:
                    triggers.append(f"flow_surge(+{d_flow[i]:.0f}vph)")
                if trig_flow_drop[i]:
                    triggers.append(f"flow_drop({d_flow[i]:.0f}vph)")
                if trig_occ_spike[i]:
                    triggers.append(f"occ_spike(+{d_occ[i]:.1f}%)")
                if trig_queue_growth[i]:
                    triggers.append(f"queue_growth(+{d_queue[i]:.1f}veh)")
                if trig_cong_surge[i]:
                    triggers.append(f"cong_surge(+{d_cong[i]:.2f})")
                evidence_reasons.append("; ".join(triggers))

        return is_anomaly, anomaly_types, confidences, evidence_reasons
