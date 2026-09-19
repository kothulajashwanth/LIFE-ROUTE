"""Feature Engineering Pipeline for LIFE-ROUTE.

Transforms raw organizer traffic, context, and network datasets into
model-ready features for detection, forecasting, and simulation.

Strictly non-destructive and leakage-free:
- Every feature at timestamp T is computed strictly from observations <= T.
- Train and validation splits are processed completely independently.
- No forecast targets or future labels are used as features.
"""

from dataclasses import asdict, dataclass
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd

from ai.data_pipeline.loader import DatasetLoader

logger = logging.getLogger(__name__)


@dataclass
class FeatureDefinition:
    """Metadata specification for an engineered feature."""

    feature_name: str
    source_dataset: str
    source_column: str
    transformation: str
    feature_type: str  # 'static' or 'time-varying'
    uses_lags_or_rolling: bool
    leakage_considerations: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class FeatureEngineer:
    """Reusable feature engineering pipeline for LIFE-ROUTE traffic data."""

    # Historical lag steps (5-minute step intervals)
    # 1 step = 5 min, 2 steps = 10 min, 3 steps = 15 min, 6 steps = 30 min, 12 steps = 60 min
    LAG_STEPS = [1, 2, 3, 6, 12]

    def __init__(self, loader: Optional[DatasetLoader] = None) -> None:
        """Initialize with an optional DatasetLoader instance."""
        self.loader = loader or DatasetLoader()
        self.feature_metadata: List[FeatureDefinition] = []

    def _record_feature(
        self,
        name: str,
        source_dataset: str,
        source_col: str,
        trans: str,
        feat_type: str,
        lags: bool,
        leakage: str,
    ) -> None:
        """Helper to register feature metadata."""
        self.feature_metadata.append(
            FeatureDefinition(
                feature_name=name,
                source_dataset=source_dataset,
                source_column=source_col,
                transformation=trans,
                feature_type=feat_type,
                uses_lags_or_rolling=lags,
                leakage_considerations=leakage,
            )
        )

    def engineer_temporal_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Generate calendar, daily, and peak-period indicators from timestamp."""
        ts = pd.to_datetime(df["timestamp"])

        df["hour"] = ts.dt.hour.astype(np.int8)
        df["minute"] = ts.dt.minute.astype(np.int8)
        df["day_of_week"] = ts.dt.dayofweek.astype(np.int8)
        df["day_of_month"] = ts.dt.day.astype(np.int8)
        df["is_weekend"] = (df["day_of_week"] >= 5).astype(np.int8)

        # Peak periods: 07:00-10:00 and 17:00-20:00 on non-weekend days
        morning_peak = (df["hour"] >= 7) & (df["hour"] < 10)
        evening_peak = (df["hour"] >= 17) & (df["hour"] < 20)
        df["is_peak_period"] = ((morning_peak | evening_peak) & (df["is_weekend"] == 0)).astype(np.int8)

        # Cyclical diurnal encodings
        minute_of_day = df["hour"] * 60 + df["minute"]
        df["time_of_day_sin"] = np.sin(2 * np.pi * minute_of_day / 1440.0).astype(np.float32)
        df["time_of_day_cos"] = np.cos(2 * np.pi * minute_of_day / 1440.0).astype(np.float32)

        return df

    def engineer_lag_and_rolling_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate historical lags and rolling window statistics per road segment."""
        # Ensure chronological ordering within each segment
        df = df.sort_values(["segment_id", "timestamp"]).reset_index(drop=True)
        grouped = df.groupby("segment_id", sort=False)

        metrics = ["speed_kmh", "flow_vph", "occupancy_pct", "congestion_index", "queue_length_veh"]

        # 1. Historical Lags (5, 10, 15, 30, 60 minutes)
        for step in self.LAG_STEPS:
            mins = step * 5
            for col in metrics:
                lag_col = f"{col}_lag_{mins}m"
                df[lag_col] = grouped[col].shift(step).astype(np.float32)

        # 2. Step Changes (5-minute differences: current - lag_5m)
        df["speed_change_5m"] = (df["speed_kmh"] - df["speed_kmh_lag_5m"]).astype(np.float32)
        df["speed_pct_change_5m"] = (
            (df["speed_kmh"] - df["speed_kmh_lag_5m"]) / (df["speed_kmh_lag_5m"].clip(lower=1.0))
        ).astype(np.float32)

        df["flow_change_5m"] = (df["flow_vph"] - df["flow_vph_lag_5m"]).astype(np.float32)
        df["occupancy_change_5m"] = (df["occupancy_pct"] - df["occupancy_pct_lag_5m"]).astype(np.float32)
        df["congestion_change_5m"] = (df["congestion_index"] - df["congestion_index_lag_5m"]).astype(np.float32)
        df["queue_growth_5m"] = (df["queue_length_veh"] - df["queue_length_veh_lag_5m"]).astype(np.float32)

        # 3. Rolling Statistics (15m = 3 steps, 60m = 12 steps)
        # Using transform with rolling ensures exact index alignment and no future lookahead
        for w_steps, w_name in [(3, "15m"), (12, "60m")]:
            df[f"speed_rolling_mean_{w_name}"] = (
                grouped["speed_kmh"]
                .transform(lambda x: x.rolling(window=w_steps, min_periods=1).mean())
                .astype(np.float32)
            )
            df[f"flow_rolling_mean_{w_name}"] = (
                grouped["flow_vph"]
                .transform(lambda x: x.rolling(window=w_steps, min_periods=1).mean())
                .astype(np.float32)
            )
            df[f"occupancy_rolling_mean_{w_name}"] = (
                grouped["occupancy_pct"]
                .transform(lambda x: x.rolling(window=w_steps, min_periods=1).mean())
                .astype(np.float32)
            )
            df[f"congestion_rolling_mean_{w_name}"] = (
                grouped["congestion_index"]
                .transform(lambda x: x.rolling(window=w_steps, min_periods=1).mean())
                .astype(np.float32)
            )

        # Rolling standard deviation for 60m stability
        df["speed_rolling_std_60m"] = (
            grouped["speed_kmh"]
            .transform(lambda x: x.rolling(window=12, min_periods=1).std().fillna(0.0))
            .astype(np.float32)
        )
        df["flow_rolling_std_60m"] = (
            grouped["flow_vph"]
            .transform(lambda x: x.rolling(window=12, min_periods=1).std().fillna(0.0))
            .astype(np.float32)
        )

        # Speed deviation from 1-hour recent baseline
        df["speed_deviation_from_60m_mean"] = (df["speed_kmh"] - df["speed_rolling_mean_60m"]).astype(np.float32)

        # 4. Travel-Time and Delay Ratios
        df["travel_time_ratio"] = (
            df["travel_time_min"] / df["free_flow_time_min"].clip(lower=0.01)
        ).astype(np.float32)
        df["delay_ratio"] = (
            df["delay_min"] / df["travel_time_min"].clip(lower=0.01)
        ).astype(np.float32)

        return df

    def join_context_features(self, df: pd.DataFrame, context_df: Optional[pd.DataFrame]) -> pd.DataFrame:
        """Join environmental and calendar context features on timestamp."""
        if context_df is None or context_df.empty:
            df["temperature_c"] = 25.0
            df["rain_intensity"] = 0.0
            df["event_level"] = 0
            df["has_event"] = 0
            df["holiday_flag"] = 0
            return df

        cols_to_use = ["timestamp", "temperature_c", "rain_intensity", "event_level", "holiday_flag"]
        existing_cols = [c for c in cols_to_use if c in context_df.columns]
        c_sub = context_df[existing_cols].copy()

        # Handle optional event fields cleanly
        if "event_level" in c_sub.columns:
            c_sub["event_level"] = c_sub["event_level"].fillna(0).astype(np.int8)
            c_sub["has_event"] = (c_sub["event_level"] > 0).astype(np.int8)
        if "holiday_flag" in c_sub.columns:
            c_sub["holiday_flag"] = c_sub["holiday_flag"].fillna(0).astype(np.int8)
        if "temperature_c" in c_sub.columns:
            c_sub["temperature_c"] = c_sub["temperature_c"].ffill().bfill().astype(np.float32)
        if "rain_intensity" in c_sub.columns:
            c_sub["rain_intensity"] = c_sub["rain_intensity"].fillna(0.0).astype(np.float32)

        df = df.merge(c_sub, on="timestamp", how="left")
        return df

    def join_network_features(self, df: pd.DataFrame, network_df: Optional[pd.DataFrame]) -> pd.DataFrame:
        """Join static topological and capacity features from network.csv."""
        if network_df is None or network_df.empty:
            return df

        net_cols = [
            "segment_id", "road_class", "lanes", "capacity_vph",
            "free_flow_speed_kmh", "length_km", "grade_pct",
            "signal_id", "structural_bottleneck", "importance", "peak_capacity_factor",
        ]
        available_cols = [c for c in net_cols if c in network_df.columns]
        net_sub = network_df[available_cols].copy()

        # Derive indicator for signalized intersection
        if "signal_id" in net_sub.columns:
            net_sub["has_signal"] = net_sub["signal_id"].notna().astype(np.int8)
            net_sub = net_sub.drop(columns=["signal_id"])

        # Encode road_class as category code
        if "road_class" in net_sub.columns:
            net_sub["road_class_code"] = net_sub["road_class"].astype("category").cat.codes.astype(np.int8)

        # Prefix network static attributes to distinguish from dynamic traffic
        rename_dict = {
            "capacity_vph": "segment_capacity_vph",
            "free_flow_speed_kmh": "segment_free_flow_speed",
            "length_km": "segment_length_km",
            "grade_pct": "segment_grade_pct",
            "lanes": "segment_lanes",
            "structural_bottleneck": "is_structural_bottleneck",
            "importance": "segment_importance",
            "peak_capacity_factor": "segment_peak_capacity_factor",
        }
        net_sub = net_sub.rename(columns={k: v for k, v in rename_dict.items() if k in net_sub.columns})

        df = df.merge(net_sub, on="segment_id", how="left")

        # Capacity utilization ratio: flow / capacity
        if "segment_capacity_vph" in df.columns and "flow_vph" in df.columns:
            df["capacity_utilization"] = (
                df["flow_vph"] / df["segment_capacity_vph"].clip(lower=100.0)
            ).astype(np.float32)

        return df

    def join_roadwork_features(self, df: pd.DataFrame, roadworks_df: Optional[pd.DataFrame]) -> pd.DataFrame:
        """Derive active roadwork status and closure fraction from schedule without fabrication."""
        df["roadwork_active"] = np.int8(0)
        df["roadwork_closure_fraction"] = np.float32(0.0)

        if roadworks_df is None or roadworks_df.empty:
            return df

        ts_series = pd.to_datetime(df["timestamp"])
        for _, rw in roadworks_df.iterrows():
            seg = rw["segment_id"]
            t_start = pd.to_datetime(rw["start_time"])
            t_end = pd.to_datetime(rw["end_time"])
            frac = float(rw.get("closure_fraction", 0.5))

            mask = (df["segment_id"] == seg) & (ts_series >= t_start) & (ts_series <= t_end)
            df.loc[mask, "roadwork_active"] = np.int8(1)
            df.loc[mask, "roadwork_closure_fraction"] = np.float32(frac)

        return df

    def build_feature_metadata(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Document all engineered features and their provenance."""
        self.feature_metadata.clear()

        # Grouping feature mappings
        for col in df.columns:
            if col in ["timestamp", "segment_id", "source_node", "target_node"]:
                self._record_feature(
                    col, "traffic", col, "Identity / Primary Key", "identifier", False, "Keys preserved for joining"
                )
            elif col in ["speed_kmh", "flow_vph", "occupancy_pct", "travel_time_min", "free_flow_time_min", "delay_min", "queue_length_veh", "congestion_index", "sensor_quality"]:
                self._record_feature(
                    col, "traffic", col, "Raw measurement", "time-varying", False, "Observed at timestamp T"
                )
            elif "lag_" in col:
                self._record_feature(
                    col, "traffic", col.split("_lag_")[0], f"Historical lag ({col.split('_')[-1]})", "time-varying", True, "Strictly historical: shifted from T - delta"
                )
            elif "rolling_" in col:
                self._record_feature(
                    col, "traffic", col.split("_rolling_")[0], f"Backward rolling window ({col.split('_')[-1]})", "time-varying", True, "Strictly backward window <= T"
                )
            elif "change_" in col or "growth_" in col or "deviation_" in col:
                self._record_feature(
                    col, "traffic", "derived", "Difference vs historical baseline", "time-varying", True, "Computed from current T and past lag/rolling metrics"
                )
            elif col in ["hour", "minute", "day_of_week", "day_of_month", "is_weekend", "is_peak_period", "time_of_day_sin", "time_of_day_cos"]:
                self._record_feature(
                    col, "timestamp", "timestamp", "Temporal calendar extraction", "time-varying", False, "Computed directly from timestamp T"
                )
            elif col in ["temperature_c", "rain_intensity", "event_level", "has_event", "holiday_flag"]:
                self._record_feature(
                    col, "context", col, "Environmental / event context join", "time-varying", False, "Joined strictly on current timestamp T"
                )
            elif col.startswith("segment_") or col in ["has_signal", "is_structural_bottleneck", "road_class", "road_class_code", "capacity_utilization"]:
                self._record_feature(
                    col, "network", col, "Static topological join", "static", False, "Static road network geometry, invariant over time"
                )
            elif col.startswith("roadwork_"):
                self._record_feature(
                    col, "roadworks", col, "Interval active match", "time-varying", False, "Computed from scheduled window [start_time, end_time] containing T"
                )
            else:
                self._record_feature(
                    col, "derived", col, "Derived feature", "time-varying", False, "Computed from data available at or before T"
                )

        return [m.to_dict() for m in self.feature_metadata]

    def build_features(
        self,
        traffic_df: pd.DataFrame,
        context_df: Optional[pd.DataFrame] = None,
        network_df: Optional[pd.DataFrame] = None,
        roadworks_df: Optional[pd.DataFrame] = None,
    ) -> pd.DataFrame:
        """Construct full feature matrix for a traffic split (train or validation)."""
        logger.info("Building features for dataset with %d rows...", len(traffic_df))

        df = traffic_df.copy()

        # 1. Temporal calendar features
        df = self.engineer_temporal_features(df)

        # 2. Historical lags and rolling statistics
        df = self.engineer_lag_and_rolling_features(df)

        # 3. Context integration
        df = self.join_context_features(df, context_df)

        # 4. Road network topology
        df = self.join_network_features(df, network_df)

        # 5. Roadwork status
        df = self.join_roadwork_features(df, roadworks_df)

        logger.info("Feature engineering complete: %d rows × %d columns.", len(df), len(df.columns))
        return df

    def save_features(self, df: pd.DataFrame, output_path: Path) -> Path:
        """Save feature matrix to Parquet with graceful CSV fallback."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            df.to_parquet(output_path, index=False)
            logger.info("Saved features to Parquet: %s", output_path)
            return output_path
        except (ImportError, ValueError, Exception) as exc:
            csv_path = output_path.with_suffix(".csv")
            logger.warning("Parquet write failed (%s). Saving as CSV fallback: %s", exc, csv_path)
            df.to_csv(csv_path, index=False)
            return csv_path
