"""Evaluation metrics and comparative audit for traffic forecasting.

Evaluates predictions against organizer ground truth using:
- MAE (Mean Absolute Error in km/h)
- RMSE (Root Mean Squared Error in km/h)
- R2 (Coefficient of Determination)
- Baseline vs Model Error Reduction comparison
"""

from dataclasses import asdict, dataclass
from typing import Any, Dict, List
import numpy as np


@dataclass
class HorizonMetrics:
    """Performance metrics for a specific forecast horizon."""

    horizon_minutes: int
    mae: float
    rmse: float
    r2: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ForecastComparison:
    """Comparison between Baseline and ML Model for a specific horizon."""

    horizon_minutes: int
    baseline_mae: float
    model_mae: float
    mae_improvement_kmh: float
    mae_reduction_pct: float
    baseline_rmse: float
    model_rmse: float
    rmse_improvement_kmh: float
    rmse_reduction_pct: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class ForecastEvaluator:
    """Evaluates multi-horizon forecasts against ground-truth targets."""

    HORIZONS: List[int] = [15, 30, 45, 60]

    @staticmethod
    def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, HorizonMetrics]:
        """Compute MAE, RMSE, R2 per horizon.

        Args:
            y_true: Ground truth array of shape (N, 4)
            y_pred: Predicted array of shape (N, 4)

        Returns:
            Dict mapping '15m', '30m', '45m', '60m' to HorizonMetrics.
        """
        results: Dict[str, HorizonMetrics] = {}

        for idx, horizon in enumerate(ForecastEvaluator.HORIZONS):
            yt = y_true[:, idx]
            yp = y_pred[:, idx]

            errors = yt - yp
            mae = float(np.mean(np.abs(errors)))
            rmse = float(np.sqrt(np.mean(errors ** 2)))

            # R2 calculation
            ss_tot = float(np.sum((yt - np.mean(yt)) ** 2))
            ss_res = float(np.sum(errors ** 2))
            r2 = float(1.0 - (ss_res / ss_tot)) if ss_tot > 0 else 0.0

            results[f"{horizon}m"] = HorizonMetrics(
                horizon_minutes=horizon,
                mae=round(mae, 4),
                rmse=round(rmse, 4),
                r2=round(r2, 4),
            )

        return results

    @staticmethod
    def compare_against_baseline(
        y_true: np.ndarray, y_baseline: np.ndarray, y_model: np.ndarray
    ) -> Dict[str, ForecastComparison]:
        """Compute empirical improvement of ML model over baseline."""
        comparisons: Dict[str, ForecastComparison] = {}

        for idx, horizon in enumerate(ForecastEvaluator.HORIZONS):
            yt = y_true[:, idx]
            yb = y_baseline[:, idx]
            ym = y_model[:, idx]

            b_mae = float(np.mean(np.abs(yt - yb)))
            m_mae = float(np.mean(np.abs(yt - ym)))
            mae_delta = b_mae - m_mae
            mae_pct = (mae_delta / b_mae * 100.0) if b_mae > 0 else 0.0

            b_rmse = float(np.sqrt(np.mean((yt - yb) ** 2)))
            m_rmse = float(np.sqrt(np.mean((yt - ym) ** 2)))
            rmse_delta = b_rmse - m_rmse
            rmse_pct = (rmse_delta / b_rmse * 100.0) if b_rmse > 0 else 0.0

            comparisons[f"{horizon}m"] = ForecastComparison(
                horizon_minutes=horizon,
                baseline_mae=round(b_mae, 4),
                model_mae=round(m_mae, 4),
                mae_improvement_kmh=round(mae_delta, 4),
                mae_reduction_pct=round(mae_pct, 2),
                baseline_rmse=round(b_rmse, 4),
                model_rmse=round(m_rmse, 4),
                rmse_improvement_kmh=round(rmse_delta, 4),
                rmse_reduction_pct=round(rmse_pct, 2),
            )

        return comparisons
