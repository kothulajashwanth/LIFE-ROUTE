"""Leakage-free baseline models for multi-horizon traffic forecasting.

Implements:
1. PersistenceBaseline: Assumes future conditions equal current observation at T.
2. HistoricalRollingBaseline: Assumes future conditions revert to the 60m rolling mean at T.
"""

from typing import Dict, List
import numpy as np
import pandas as pd


class PersistenceBaseline:
    """Predicts future speed at T+h using strictly current speed at timestamp T."""

    def __init__(self, horizons: List[int] = [15, 30, 45, 60]) -> None:
        self.horizons = horizons

    def predict(self, df: pd.DataFrame, value_col: str = "speed_kmh") -> np.ndarray:
        """Vectorized persistence forecast across all horizons.

        Returns:
            ndarray of shape (N, len(horizons)) where every column equals df[value_col].
        """
        curr = df[value_col].to_numpy(dtype=np.float32)
        return np.column_stack([curr for _ in self.horizons])


class HistoricalRollingBaseline:
    """Predicts future speed at T+h using strictly 60m backward rolling mean at T."""

    def __init__(self, horizons: List[int] = [15, 30, 45, 60]) -> None:
        self.horizons = horizons

    def predict(self, df: pd.DataFrame, rolling_col: str = "speed_rolling_mean_60m") -> np.ndarray:
        """Vectorized rolling mean forecast across all horizons.

        Returns:
            ndarray of shape (N, len(horizons)).
        """
        if rolling_col in df.columns:
            val = df[rolling_col].to_numpy(dtype=np.float32)
        else:
            val = df["speed_kmh"].to_numpy(dtype=np.float32)
        return np.column_stack([val for _ in self.horizons])
