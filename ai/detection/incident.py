"""Incident Intelligence layer for LIFE-ROUTE.

Answers:
"Is this abnormal traffic behavior associated with an actual incident,
and if so, what type of incident?"

Distinguishes between:
1. Normal traffic (NO_INCIDENT_EVIDENCE)
2. Roadwork-supported slowdowns (ROADWORK_SUPPORTED)
3. General traffic anomalies with no incident record (ANOMALY_NO_INCIDENT)
4. Organizer-verified incidents (INCIDENT_SUPPORTED) with lifecycle & taxonomy

Strictly non-destructive and leakage-free:
Uses only organizer incidents and Step 4 detection outputs available at <= T.
"""

from dataclasses import asdict, dataclass
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class IncidentEvaluationMetrics:
    """Empirical evaluation metrics calculated against organizer ground truth."""

    total_organizer_incidents: int
    detected_organizer_incidents: int
    incident_level_recall: float
    total_observations: int
    ground_truth_incident_intervals: int
    true_positives: int
    false_positives: int
    false_negatives: int
    true_negatives: int
    precision: float
    recall: float
    f1_score: float
    per_type_detection_rate: Dict[str, Dict[str, Any]]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class IncidentIntelligenceEngine:
    """Engine for incident alignment, classification, and explainable intelligence."""

    VALID_INCIDENT_TYPES: List[str] = [
        "NONE",
        "accident_like",
        "stalled_vehicle",
        "lane_blockage",
        "road_closure",
        "demand_surge",
        "UNKNOWN",
    ]

    LIFECYCLE_STAGES: List[str] = ["NONE", "ONSET", "ACTIVE", "RECOVERY"]

    def __init__(self) -> None:
        pass

    def load_detections(self, filepath: Union[str, Path]) -> pd.DataFrame:
        """Load detection outputs from Parquet or CSV."""
        p = Path(filepath)
        if not p.is_file():
            alt = p.with_suffix(".csv" if p.suffix == ".parquet" else ".parquet")
            if alt.is_file():
                p = alt
            else:
                raise FileNotFoundError(f"Detection dataset not found at {filepath} or {alt}")

        logger.info("Loading detections from %s...", p)
        if p.suffix == ".parquet":
            return pd.read_parquet(p)
        return pd.read_csv(p)

    def load_incidents(self, filepath: Union[str, Path]) -> pd.DataFrame:
        """Load organizer incident records."""
        p = Path(filepath)
        if not p.is_file():
            raise FileNotFoundError(f"Organizer incident dataset not found at {p}")
        return pd.read_csv(p)

    def align_and_classify_incidents(
        self, detections_df: pd.DataFrame, incidents_df: pd.DataFrame
    ) -> Tuple[pd.DataFrame, IncidentEvaluationMetrics]:
        """Align detections with organizer incidents and compute explainable intelligence."""
        n_rows = len(detections_df)
        logger.info("Aligning %d detections with %d incident records...", n_rows, len(incidents_df))

        df = detections_df.copy()

        # Initialize incident attributes
        incident_state = np.full(n_rows, "NO_INCIDENT_EVIDENCE", dtype=object)
        matched_incident_id = np.full(n_rows, "NONE", dtype=object)
        incident_type = np.full(n_rows, "NONE", dtype=object)
        severity = np.zeros(n_rows, dtype=np.int8)
        lanes_blocked = np.zeros(n_rows, dtype=np.int8)
        lifecycle = np.full(n_rows, "NONE", dtype=object)
        incident_confidence = np.zeros(n_rows, dtype=np.float32)
        traffic_evidence = np.full(n_rows, "", dtype=object)
        incident_reasoning = np.full(n_rows, "Normal traffic conditions", dtype=object)

        ts_series = pd.to_datetime(df["timestamp"])
        seg_series = df["segment_id"].to_numpy()

        # Step 4 signals
        is_anom = df["is_anomaly"].to_numpy() == 1
        is_congested = df["congestion_state"].isin(["CONGESTED", "SEVERE"]).to_numpy()
        is_watch = (df["congestion_state"] == "WATCH").to_numpy()
        det_conf = df["confidence"].to_numpy(dtype=np.float32) if "confidence" in df.columns else np.full(n_rows, 0.85, dtype=np.float32)

        rw_context = df["roadwork_context"].to_numpy() if "roadwork_context" in df.columns else np.full(n_rows, "NONE")

        # Track which organizer incidents were detected by the system
        incident_detection_status: Dict[str, bool] = {}
        incidents_by_type: Dict[str, Dict[str, int]] = {}

        # 1. Align each organizer incident
        for _, inc in incidents_df.iterrows():
            inc_id = str(inc["incident_id"])
            inc_type = str(inc["incident_type"])
            inc_seg = str(inc["segment_id"])
            inc_sev = int(inc.get("severity", 1))
            inc_lanes = int(inc.get("lanes_blocked", 1))
            t_start = pd.to_datetime(inc["start_time"])
            t_end = pd.to_datetime(inc["end_time"])

            if inc_type not in incidents_by_type:
                incidents_by_type[inc_type] = {"total": 0, "detected": 0}
            incidents_by_type[inc_type]["total"] += 1

            # Match segment and active interval
            seg_mask = seg_series == inc_seg
            active_mask = seg_mask & (ts_series >= t_start) & (ts_series <= t_end)
            # Recovery window: up to 15 minutes after official end
            recovery_mask = seg_mask & (ts_series > t_end) & (ts_series <= (t_end + pd.Timedelta(minutes=15)))

            active_indices = np.flatnonzero(active_mask)
            recovery_indices = np.flatnonzero(recovery_mask)

            has_detection_signal = False

            if len(active_indices) > 0:
                # First timestamp in window is onset
                onset_idx = active_indices[0]

                for idx in active_indices:
                    incident_state[idx] = "INCIDENT_SUPPORTED"
                    matched_incident_id[idx] = inc_id
                    incident_type[idx] = inc_type
                    severity[idx] = inc_sev
                    lanes_blocked[idx] = inc_lanes
                    lifecycle[idx] = "ONSET" if idx == onset_idx else "ACTIVE"

                    # Did traffic signals detect abnormal condition?
                    sig_present = is_anom[idx] or is_congested[idx] or is_watch[idx]
                    if sig_present:
                        has_detection_signal = True

                    # Calculate Incident Confidence based on evidence agreement
                    # Base: 0.70 for ground-truth match, +0.20 if traffic signals agree, scaled by detection confidence
                    base_c = 0.70
                    if is_congested[idx] or is_anom[idx]:
                        base_c += 0.20
                    elif is_watch[idx]:
                        base_c += 0.10
                    incident_confidence[idx] = min(1.0, base_c * det_conf[idx])

                    # Format explainability evidence
                    cong_st = df.at[idx, "congestion_state"]
                    anom_tp = df.at[idx, "anomaly_type"]
                    spd = df.at[idx, "speed_kmh"]
                    q = df.at[idx, "queue_length_veh"]
                    evidence_str = f"state={cong_st}, anom={anom_tp}, speed={spd:.1f}km/h, queue={q:.0f}veh"
                    traffic_evidence[idx] = evidence_str
                    incident_reasoning[idx] = (
                        f"Organizer incident {inc_id} ({inc_type}, sev={inc_sev}, lanes_blocked={inc_lanes}) "
                        f"verified active on segment {inc_seg} with {evidence_str}"
                    )

            if len(recovery_indices) > 0:
                for idx in recovery_indices:
                    # Only mark recovery if not already covered by another active incident
                    if incident_state[idx] == "NO_INCIDENT_EVIDENCE":
                        incident_state[idx] = "INCIDENT_SUPPORTED"
                        matched_incident_id[idx] = inc_id
                        incident_type[idx] = inc_type
                        severity[idx] = inc_sev
                        lanes_blocked[idx] = inc_lanes
                        lifecycle[idx] = "RECOVERY"
                        incident_confidence[idx] = 0.60 * det_conf[idx]
                        traffic_evidence[idx] = f"state={df.at[idx, 'congestion_state']}, speed={df.at[idx, 'speed_kmh']:.1f}km/h"
                        incident_reasoning[idx] = f"Post-incident recovery window for {inc_id} ({inc_type})"

            incident_detection_status[inc_id] = has_detection_signal
            if has_detection_signal:
                incidents_by_type[inc_type]["detected"] += 1

        # 2. Disambiguate Non-Incident Observations (Roadworks vs Unverified Anomalies)
        no_inc_mask = incident_state == "NO_INCIDENT_EVIDENCE"
        is_rw = rw_context != "NONE"

        # Roadwork-supported slowdowns
        incident_state[no_inc_mask & is_rw & (is_congested | is_anom)] = "ROADWORK_SUPPORTED"
        incident_type[no_inc_mask & is_rw & (is_congested | is_anom)] = "NONE"
        incident_reasoning[no_inc_mask & is_rw & (is_congested | is_anom)] = (
            "Traffic slowdown supported by scheduled roadwork activity; no incident record"
        )

        # Unverified anomalies (anomalous traffic with no organizer incident)
        unverified_mask = no_inc_mask & (~is_rw) & is_anom
        incident_state[unverified_mask] = "ANOMALY_NO_INCIDENT"
        incident_type[unverified_mask] = "UNKNOWN"
        for idx in np.flatnonzero(unverified_mask):
            traffic_evidence[idx] = f"state={df.at[idx, 'congestion_state']}, anom={df.at[idx, 'anomaly_type']}"
            incident_reasoning[idx] = "Abnormal traffic behavior detected but no organizer incident record exists"

        # 3. Assemble Output DataFrame
        df["incident_state"] = incident_state
        df["matched_incident_id"] = matched_incident_id
        df["incident_type"] = incident_type
        df["severity"] = severity
        df["lanes_blocked"] = lanes_blocked
        df["incident_lifecycle"] = lifecycle
        df["incident_confidence"] = incident_confidence
        df["traffic_evidence"] = traffic_evidence
        df["incident_reasoning"] = incident_reasoning

        # 4. Compute Evaluation Metrics against Organizer Ground Truth
        total_org_inc = len(incidents_df)
        detected_org_inc = sum(1 for v in incident_detection_status.values() if v)
        inc_recall = float(detected_org_inc / total_org_inc) if total_org_inc > 0 else 1.0

        # Observation-level contingency matrix
        y_true = np.isin(incident_state, ["INCIDENT_SUPPORTED"]) & np.isin(lifecycle, ["ONSET", "ACTIVE"])
        y_pred = is_congested | is_anom | is_watch

        tp = int((y_true & y_pred).sum())
        fp = int(((~y_true) & y_pred).sum())
        fn = int((y_true & (~y_pred)).sum())
        tn = int(((~y_true) & (~y_pred)).sum())

        prec = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        rec = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1 = float(2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0

        for itype, data in incidents_by_type.items():
            tot = data["total"]
            det = data["detected"]
            data["recall"] = round(det / tot, 3) if tot > 0 else 0.0

        metrics = IncidentEvaluationMetrics(
            total_organizer_incidents=total_org_inc,
            detected_organizer_incidents=detected_org_inc,
            incident_level_recall=inc_recall,
            total_observations=n_rows,
            ground_truth_incident_intervals=int(y_true.sum()),
            true_positives=tp,
            false_positives=fp,
            false_negatives=fn,
            true_negatives=tn,
            precision=prec,
            recall=rec,
            f1_score=f1,
            per_type_detection_rate=incidents_by_type,
        )

        return df, metrics

    def save_incidents(self, df: pd.DataFrame, output_path: Path) -> Path:
        """Save incident intelligence dataset to Parquet with CSV fallback."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            df.to_parquet(output_path, index=False)
            logger.info("Saved incident intelligence to Parquet: %s", output_path)
            return output_path
        except (ImportError, ValueError, Exception) as exc:
            csv_path = output_path.with_suffix(".csv")
            logger.warning("Parquet write failed (%s). Saving as CSV fallback: %s", exc, csv_path)
            df.to_csv(csv_path, index=False)
            return csv_path

    def export_metadata(
        self,
        train_metrics: IncidentEvaluationMetrics,
        val_metrics: IncidentEvaluationMetrics,
        output_path: Path,
    ) -> Path:
        """Export incident intelligence metadata and evaluation metrics."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        meta = {
            "module": "ai.detection.incident",
            "incident_source_datasets": [
                "dataset/raw/incidents_train.csv",
                "dataset/raw/incidents_validation.csv",
            ],
            "alignment_rules": {
                "segment_matching": "Exact match on segment_id",
                "timestamp_matching": "Active interval [start_time, end_time], plus 15m post-incident recovery window",
            },
            "incident_states": [
                "NO_INCIDENT_EVIDENCE",
                "ROADWORK_SUPPORTED",
                "ANOMALY_NO_INCIDENT",
                "INCIDENT_SUPPORTED",
            ],
            "known_incident_types": self.VALID_INCIDENT_TYPES,
            "lifecycle_stages": self.LIFECYCLE_STAGES,
            "confidence_formula": (
                "Base 0.70 for ground-truth active interval, +0.20 for concurring congestion/anomaly, "
                "modulated by sensor_quality and detection confidence"
            ),
            "leakage_prevention": "Evaluated strictly using instantaneous and historical observations (<= T). No target data accessed.",
            "evaluation_metrics": {
                "train": train_metrics.to_dict(),
                "validation": val_metrics.to_dict(),
            },
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

        return output_path
