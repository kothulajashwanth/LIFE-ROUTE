"""Unified Detection Engine for LIFE-ROUTE.

Coordinates:
1. Multi-signal congestion state classification (NORMAL, WATCH, CONGESTED, SEVERE)
2. Statistical and dynamic anomaly detection
3. Temporal state tracking (STABLE, ONSET, PERSISTENT, RECOVERY)
4. Contextual roadwork awareness (Expected vs Unexpected slowdowns)
5. Evidence capture and explainability
6. Parquet/CSV export and metadata documentation
"""

from dataclasses import asdict, dataclass
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd

from ai.detection.anomaly import AnomalyConfig, AnomalyDetector
from ai.detection.congestion import CongestionClassifier, CongestionConfig

logger = logging.getLogger(__name__)


@dataclass
class DetectionSummary:
    """Statistical summary of detection results across a dataset."""

    dataset_name: str
    total_records: int
    normal_count: int
    watch_count: int
    congested_count: int
    severe_count: int
    anomaly_count: int
    anomaly_breakdown: Dict[str, int]
    temporal_breakdown: Dict[str, int]
    mean_confidence: float
    min_confidence: float
    max_confidence: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class DetectionEngine:
    """Core intelligence engine for real-time traffic detection and explanation."""

    COLS_TO_LOAD = [
        "timestamp", "segment_id", "source_node", "target_node",
        "speed_kmh", "flow_vph", "occupancy_pct", "travel_time_min",
        "free_flow_time_min", "delay_min", "queue_length_veh",
        "congestion_index", "sensor_quality",
        "speed_change_5m", "flow_change_5m", "occupancy_change_5m",
        "congestion_change_5m", "queue_growth_5m",
        "speed_rolling_mean_60m", "speed_rolling_std_60m",
        "speed_deviation_from_60m_mean",
        "travel_time_ratio", "delay_ratio",
        "segment_capacity_vph", "segment_free_flow_speed",
        "capacity_utilization", "is_peak_period",
        "roadwork_active", "roadwork_closure_fraction",
    ]

    def __init__(
        self,
        congestion_config: Optional[CongestionConfig] = None,
        anomaly_config: Optional[AnomalyConfig] = None,
    ) -> None:
        self.congestion_classifier = CongestionClassifier(config=congestion_config)
        self.anomaly_detector = AnomalyDetector(config=anomaly_config)

    def load_feature_matrix(self, filepath: Union[str, Path]) -> pd.DataFrame:
        """Load feature matrix from Parquet or CSV with memory optimization."""
        p = Path(filepath)
        if not p.is_file():
            # Check for alternate extension (.parquet vs .csv)
            alt = p.with_suffix(".csv" if p.suffix == ".parquet" else ".parquet")
            if alt.is_file():
                p = alt
            else:
                raise FileNotFoundError(f"Feature dataset not found at {filepath} or {alt}")

        logger.info("Loading feature matrix from %s...", p)
        if p.suffix == ".parquet":
            # Load only required columns if possible
            try:
                return pd.read_parquet(p, columns=self.COLS_TO_LOAD)
            except Exception:
                return pd.read_parquet(p)
        else:
            # CSV: load only required columns present in file
            peek = pd.read_csv(p, nrows=1)
            avail = [c for c in self.COLS_TO_LOAD if c in peek.columns]
            return pd.read_csv(p, usecols=avail)

    def compute_temporal_status(self, df: pd.DataFrame, states: np.ndarray) -> np.ndarray:
        """Compute temporal progression (STABLE, ONSET, PERSISTENT, RECOVERY) per segment."""
        n_rows = len(df)
        status = np.full(n_rows, "STABLE", dtype=object)

        # Temporary series to track transitions within segments
        state_series = pd.Series(states, index=df.index)
        is_heavy = state_series.isin(["CONGESTED", "SEVERE"])

        # Group by segment to evaluate previous state
        prev_heavy = is_heavy.groupby(df["segment_id"], sort=False).shift(1).fillna(False)

        # Vectorized status logic
        onset_mask = (~prev_heavy) & is_heavy
        persistent_mask = prev_heavy & is_heavy
        recovery_mask = prev_heavy & (~is_heavy)

        status[onset_mask.to_numpy()] = "ONSET"
        status[persistent_mask.to_numpy()] = "PERSISTENT"
        status[recovery_mask.to_numpy()] = "RECOVERY"

        return status

    def evaluate_roadwork_context(
        self, df: pd.DataFrame, states: np.ndarray, is_anomaly: np.ndarray
    ) -> np.ndarray:
        """Categorize whether slowdowns are expected due to active roadworks."""
        n_rows = len(df)
        context = np.full(n_rows, "NONE", dtype=object)

        if "roadwork_active" not in df.columns:
            return context

        rw_active = df["roadwork_active"].to_numpy() == 1
        is_slow = np.isin(states, ["WATCH", "CONGESTED", "SEVERE"]) | is_anomaly

        # Roadwork active with moderate slowdown: expected impact
        context[rw_active & is_slow] = "EXPECTED_ROADWORK_SLOWDOWN"
        # Roadwork active with severe collapse: excess bottleneck
        context[rw_active & (states == "SEVERE")] = "EXCESS_ROADWORK_BOTTLENECK"

        return context

    def process_features(self, df: pd.DataFrame, dataset_name: str = "dataset") -> Tuple[pd.DataFrame, DetectionSummary]:
        """Execute full detection pipeline on a feature DataFrame."""
        logger.info("Running detection on %s (%d records)...", dataset_name, len(df))

        # 1. Congestion state classification
        cong_scores, cong_states = self.congestion_classifier.compute_congestion_score(df)

        # 2. Anomaly detection & categorization
        is_anom, anom_types, confidences, reasons = self.anomaly_detector.detect_anomalies(df)

        # 3. Temporal consistency
        temp_status = self.compute_temporal_status(df, cong_states)

        # 4. Roadwork awareness context
        rw_context = self.evaluate_roadwork_context(df, cong_states, is_anom)

        # 5. Assemble Detection Results DataFrame
        detections = pd.DataFrame({
            "timestamp": df["timestamp"],
            "segment_id": df["segment_id"],
            "source_node": df["source_node"],
            "target_node": df["target_node"],
            "congestion_score": cong_scores,
            "congestion_state": cong_states,
            "is_anomaly": is_anom.astype(np.int8),
            "anomaly_type": anom_types,
            "confidence": confidences,
            "temporal_status": temp_status,
            "roadwork_context": rw_context,
            "evidence_reason": reasons,
            # Core observations retained for downstream explainability
            "speed_kmh": df["speed_kmh"],
            "flow_vph": df["flow_vph"],
            "occupancy_pct": df["occupancy_pct"],
            "queue_length_veh": df["queue_length_veh"] if "queue_length_veh" in df.columns else 0.0,
            "delay_min": df["delay_min"] if "delay_min" in df.columns else 0.0,
        })

        # 6. Aggregate Summary
        anom_counts = pd.Series(anom_types).value_counts().to_dict()
        temp_counts = pd.Series(temp_status).value_counts().to_dict()
        state_counts = pd.Series(cong_states).value_counts().to_dict()

        summary = DetectionSummary(
            dataset_name=dataset_name,
            total_records=len(df),
            normal_count=int(state_counts.get("NORMAL", 0)),
            watch_count=int(state_counts.get("WATCH", 0)),
            congested_count=int(state_counts.get("CONGESTED", 0)),
            severe_count=int(state_counts.get("SEVERE", 0)),
            anomaly_count=int(is_anom.sum()),
            anomaly_breakdown={k: int(v) for k, v in anom_counts.items()},
            temporal_breakdown={k: int(v) for k, v in temp_counts.items()},
            mean_confidence=float(np.mean(confidences)),
            min_confidence=float(np.min(confidences)),
            max_confidence=float(np.max(confidences)),
        )

        return detections, summary

    def save_detections(self, df: pd.DataFrame, output_path: Path) -> Path:
        """Save detection results to Parquet with graceful CSV fallback."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            df.to_parquet(output_path, index=False)
            logger.info("Saved detections to Parquet: %s", output_path)
            return output_path
        except (ImportError, ValueError, Exception) as exc:
            csv_path = output_path.with_suffix(".csv")
            logger.warning("Parquet write failed (%s). Saving as CSV fallback: %s", exc, csv_path)
            df.to_csv(csv_path, index=False)
            return csv_path

    def export_metadata(
        self,
        summaries: List[DetectionSummary],
        output_path: Path,
    ) -> Path:
        """Export detection methodology and performance metadata."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        meta = {
            "module": "ai.detection",
            "congestion_methodology": {
                "states": CongestionClassifier.STATES,
                "multi_signal_components": [
                    {"signal": "speed_penalty", "weight": 0.35, "description": "Speed ratio vs segment free-flow speed"},
                    {"signal": "congestion_index", "weight": 0.30, "description": "Direct organizer sensor congestion metric"},
                    {"signal": "delay_ratio", "weight": 0.15, "description": "Delay relative to travel time"},
                    {"signal": "queue_ratio", "weight": 0.10, "description": "Queue length scaled against typical bottleneck capacity"},
                    {"signal": "capacity_utilization", "weight": 0.10, "description": "Volume-to-capacity saturation ratio"},
                ],
                "score_thresholds": {
                    "NORMAL": "< 0.25",
                    "WATCH": "0.25 - 0.50",
                    "CONGESTED": "0.50 - 0.75",
                    "SEVERE": ">= 0.75",
                },
            },
            "anomaly_methodology": {
                "types": AnomalyDetector.ANOMALY_TYPES,
                "rules": {
                    "SPEED_DROP": "z_score < -2.5 or 5m step drop < -15 km/h",
                    "FLOW_SURGE": "5m flow surge > 800 vph",
                    "FLOW_DROP": "5m flow collapse < -800 vph with negative speed z-score",
                    "OCCUPANCY_SPIKE": "5m occupancy surge > 20%",
                    "QUEUE_GROWTH": "5m queue accumulation >= 8 vehicles",
                    "CONGESTION_SURGE": "5m congestion index delta >= 0.25",
                    "MULTI_SIGNAL_ANOMALY": "2 or more anomalous conditions concurring",
                },
            },
            "confidence_methodology": {
                "range": "[0.0, 1.0]",
                "calculation": "Base 0.85 for normal, or (0.50 + 0.15 * concurring_signals + 0.20 * z_severity) * sensor_quality",
            },
            "temporal_consistency": {
                "states": ["STABLE", "ONSET", "PERSISTENT", "RECOVERY"],
                "definition": "Markovian progression across consecutive 5-minute intervals per segment",
            },
            "leakage_prevention": "Strictly instantaneous and historical (<= T). No future observations or forecast target files accessed.",
            "dataset_summaries": [s.to_dict() for s in summaries],
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

        return output_path
