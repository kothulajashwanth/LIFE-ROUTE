"""Feature preparation and causal dataset builder for traffic forecasting.

Strictly preserves causal boundaries:
- Input feature matrix X(T) contains only observations available at or before T.
- Targets Y(T) contain future observations at T + [15, 30, 45, 60] min.
- Zero target columns or future observations are permitted in X.
"""

from pathlib import Path
from typing import List, Optional, Tuple, Union
import numpy as np
import pandas as pd


# Strictly causal features for forecasting
CAUSAL_FEATURE_COLS: List[str] = [
    # Instantaneous measurements at T
    "speed_kmh",
    "flow_vph",
    "occupancy_pct",
    "congestion_index",
    "queue_length_veh",
    "delay_min",
    "travel_time_ratio",
    "delay_ratio",
    # Short-term step dynamics (T vs T-5m)
    "speed_change_5m",
    "flow_change_5m",
    "occupancy_change_5m",
    "queue_growth_5m",
    "congestion_change_5m",
    # Multi-scale historical lags (T-5m, T-10m, T-15m, T-30m, T-60m)
    "speed_kmh_lag_5m",
    "speed_kmh_lag_10m",
    "speed_kmh_lag_15m",
    "speed_kmh_lag_30m",
    "speed_kmh_lag_60m",
    "flow_vph_lag_15m",
    "occupancy_pct_lag_15m",
    "congestion_index_lag_15m",
    # Backward rolling statistics (<= T)
    "speed_rolling_mean_15m",
    "speed_rolling_mean_60m",
    "speed_rolling_std_60m",
    "speed_deviation_from_60m_mean",
    # Temporal diurnal and calendar context at T
    "hour",
    "minute",
    "day_of_week",
    "is_weekend",
    "is_peak_period",
    "time_of_day_sin",
    "time_of_day_cos",
    # Static infrastructure and topology
    "segment_free_flow_speed",
    "segment_capacity_vph",
    "segment_length_km",
    "capacity_utilization",
    "is_structural_bottleneck",
    "has_signal",
    # Environmental and operational context at T
    "temperature_c",
    "rain_intensity",
    "roadwork_active",
]

TARGET_SPEED_COLS: List[str] = [
    "target_speed_15m",
    "target_speed_30m",
    "target_speed_45m",
    "target_speed_60m",
]

TARGET_HORIZONS: List[int] = [15, 30, 45, 60]


class ForecastingFeatureBuilder:
    """Extracts, validates, and aligns causal features with ground-truth targets."""

    def __init__(self, feature_cols: Optional[List[str]] = None) -> None:
        self.feature_cols = feature_cols or CAUSAL_FEATURE_COLS

    def load_and_align_dataset(
        self,
        features_path: Union[str, Path],
        targets_path: Union[str, Path],
    ) -> Tuple[pd.DataFrame, np.ndarray, np.ndarray, List[str]]:
        """Load features and targets, align on (timestamp, segment_id), and prepare arrays.

        Returns:
            Tuple of:
            - aligned_df: DataFrame containing keys, raw speed, and metadata
            - X: 2D ndarray of float32 feature matrix (shape N, D)
            - Y: 2D ndarray of float32 ground-truth speed targets (shape N, 4)
            - feature_names: List of feature names used
        """
        f_path = Path(features_path)
        t_path = Path(targets_path)

        if not f_path.is_file():
            alt = f_path.with_suffix(".csv" if f_path.suffix == ".parquet" else ".parquet")
            if alt.is_file():
                f_path = alt
            else:
                raise FileNotFoundError(f"Features file not found at {f_path} or {alt}")

        # 1. Load targets
        targets_df = pd.read_csv(t_path)
        required_keys = ["timestamp", "segment_id"]
        for col in required_keys + TARGET_SPEED_COLS:
            if col not in targets_df.columns:
                raise ValueError(f"Missing required target column '{col}' in {t_path}")

        # 2. Load features (only load required columns for speed and memory efficiency)
        cols_to_load = list(set(required_keys + self.feature_cols))
        if f_path.suffix == ".parquet":
            try:
                features_df = pd.read_parquet(f_path, columns=cols_to_load)
            except Exception:
                features_df = pd.read_parquet(f_path)
        else:
            peek = pd.read_csv(f_path, nrows=1)
            avail_cols = [c for c in cols_to_load if c in peek.columns]
            features_df = pd.read_csv(f_path, usecols=avail_cols)

        # 3. Inner join on (timestamp, segment_id)
        aligned = pd.merge(
            features_df,
            targets_df[required_keys + TARGET_SPEED_COLS],
            on=required_keys,
            how="inner",
        )

        # 4. Verify feature availability and handle boundary NaNs
        active_features = [c for c in self.feature_cols if c in aligned.columns]

        # Initial lag rows contain NaNs (first 1 hour of each segment); fill with current speed or forward fill
        for col in active_features:
            if aligned[col].isna().any():
                if "speed" in col and "speed_kmh" in aligned.columns:
                    aligned[col] = aligned[col].fillna(aligned["speed_kmh"])
                else:
                    aligned[col] = aligned[col].fillna(0.0)

        # 5. Extract numpy matrices
        X = aligned[active_features].to_numpy(dtype=np.float32)
        Y = aligned[TARGET_SPEED_COLS].to_numpy(dtype=np.float32)

        return aligned, X, Y, active_features
