"""Prediction pipeline for multi-horizon traffic forecasting.

Generates:
1. Multi-horizon speed forecasts [15m, 30m, 45m, 60m]
2. Empirical 95% uncertainty intervals [lower_bound, upper_bound]
3. Future segment travel times in minutes for downstream routing
4. Predicted congestion states based on forecast velocities
"""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd

from ai.forecasting.baseline import PersistenceBaseline
from ai.forecasting.model import TrafficForecaster

logger = logging.getLogger(__name__)


class ForecastPredictor:
    """Orchestrates multi-horizon inference and builds downstream intelligence artifacts."""

    HORIZONS: List[int] = [15, 30, 45, 60]

    def __init__(self, forecaster: TrafficForecaster) -> None:
        self.forecaster = forecaster
        self.baseline = PersistenceBaseline()

    def generate_predictions_df(
        self,
        aligned_df: pd.DataFrame,
        X: np.ndarray,
    ) -> pd.DataFrame:
        """Construct comprehensive predictions DataFrame with uncertainty and travel times.

        Args:
            aligned_df: DataFrame with (timestamp, segment_id) and static attributes
            X: Input feature matrix (N, D)

        Returns:
            DataFrame containing predictions, intervals, baseline, and derived travel times.
        """
        n_rows = len(aligned_df)
        logger.info("Generating forecasts for %d records...", n_rows)

        # 1. Point forecasts and uncertainty intervals
        preds, lower, upper = self.forecaster.predict_with_uncertainty(X, confidence_level=0.95)

        # 2. Baseline persistence predictions
        base_preds = self.baseline.predict(aligned_df, value_col="speed_kmh")

        # 3. Assemble predictions dictionary
        out_dict: Dict[str, Any] = {
            "timestamp": aligned_df["timestamp"].values,
            "segment_id": aligned_df["segment_id"].values,
            "current_speed_kmh": aligned_df["speed_kmh"].values,
        }

        # Segment length and free-flow speed for dynamic travel-time computation
        seg_len = (
            aligned_df["segment_length_km"].to_numpy(dtype=np.float32)
            if "segment_length_km" in aligned_df.columns
            else np.full(n_rows, 1.0, dtype=np.float32)
        )
        ff_speed = (
            aligned_df["segment_free_flow_speed"].to_numpy(dtype=np.float32)
            if "segment_free_flow_speed" in aligned_df.columns
            else np.full(n_rows, 50.0, dtype=np.float32)
        )
        ff_speed = np.clip(ff_speed, a_min=10.0, a_max=150.0)

        for h_idx, horizon in enumerate(self.HORIZONS):
            p = preds[:, h_idx]
            lo = lower[:, h_idx]
            hi = upper[:, h_idx]
            b = base_preds[:, h_idx]

            out_dict[f"pred_speed_{horizon}m"] = p
            out_dict[f"pred_speed_lower_{horizon}m"] = lo
            out_dict[f"pred_speed_upper_{horizon}m"] = hi
            out_dict[f"base_speed_{horizon}m"] = b

            # Future travel time in minutes: length / speed * 60
            v_safe = np.clip(p, a_min=1.0, a_max=150.0)
            out_dict[f"pred_travel_time_{horizon}m_min"] = (seg_len / v_safe) * 60.0

            # Predicted congestion state based on future speed ratio
            ratio = p / ff_speed
            state = np.full(n_rows, "NORMAL", dtype=object)
            state[ratio < 0.75] = "WATCH"
            state[ratio < 0.50] = "CONGESTED"
            state[ratio < 0.30] = "SEVERE"
            out_dict[f"pred_congestion_state_{horizon}m"] = state

        return pd.DataFrame(out_dict)

    @staticmethod
    def save_predictions(df: pd.DataFrame, output_path: Path) -> Path:
        """Save prediction artifact to Parquet with graceful CSV fallback."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            df.to_parquet(output_path, index=False)
            logger.info("Saved forecast predictions to Parquet: %s", output_path)
            return output_path
        except (ImportError, ValueError, Exception) as exc:
            csv_path = output_path.with_suffix(".csv")
            logger.warning("Parquet write failed (%s). Saving as CSV fallback: %s", exc, csv_path)
            df.to_csv(csv_path, index=False)
            return csv_path
