"""Direct Multi-Horizon Traffic Forecaster.

Predicts speed at T+15m, T+30m, T+45m, and T+60m using regularized
multi-output regression with empirical residual uncertainty bands.

Properties:
- Non-recursive: zero compounding error.
- Direct analytical solution: deterministic and reproducible.
- Explainable: model coefficients directly map feature influences per horizon.
- Strictly causal: only features from <= T are used.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler


@dataclass
class ForecastHorizonArtifact:
    """Artifact metadata for a single prediction horizon."""

    horizon_minutes: int
    residual_std: float
    top_positive_features: List[Tuple[str, float]]
    top_negative_features: List[Tuple[str, float]]


class TrafficForecaster:
    """Direct multi-horizon regressor for speed prediction across 15m, 30m, 45m, and 60m."""

    HORIZONS: List[int] = [15, 30, 45, 60]

    def __init__(self, alpha: float = 10.0) -> None:
        self.alpha = alpha
        self.scaler = StandardScaler()
        self.model = Ridge(alpha=self.alpha, fit_intercept=True)
        self.is_fitted = False
        self.feature_names: List[str] = []
        self.residual_stds: np.ndarray = np.zeros(len(self.HORIZONS), dtype=np.float32)

    def fit(self, X: np.ndarray, Y: np.ndarray, feature_names: List[str]) -> "TrafficForecaster":
        """Fit scaler and direct multi-output Ridge model on training split.

        Args:
            X: Input feature matrix of shape (N, D)
            Y: Ground truth target matrix of shape (N, 4)
            feature_names: List of D feature names
        """
        self.feature_names = feature_names

        # 1. Standardize features
        X_scaled = self.scaler.fit_transform(X)

        # 2. Fit multi-output Ridge model
        self.model.fit(X_scaled, Y)
        self.is_fitted = True

        # 3. Compute empirical residual standard deviations on training set
        Y_pred = self.model.predict(X_scaled)
        residuals = Y - Y_pred
        self.residual_stds = np.std(residuals, axis=0).astype(np.float32)

        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Generate point predictions for all 4 horizons.

        Returns:
            ndarray of shape (N, 4) representing [15m, 30m, 45m, 60m] speed predictions in km/h.
        """
        if not self.is_fitted:
            raise RuntimeError("TrafficForecaster must be fitted before calling predict.")

        X_scaled = self.scaler.transform(X)
        preds = self.model.predict(X_scaled)

        # Speed cannot be negative; clip at physical lower bound 0.0
        return np.clip(preds, a_min=0.0, a_max=150.0).astype(np.float32)

    def predict_with_uncertainty(self, X: np.ndarray, confidence_level: float = 0.95) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Generate point forecasts alongside empirical prediction intervals.

        Args:
            X: Input feature matrix (N, D)
            confidence_level: Interval coverage (default 0.95 -> 1.96 std)

        Returns:
            Tuple of (predictions: ndarray, lower_bounds: ndarray, upper_bounds: ndarray)
        """
        preds = self.predict(X)

        # Multiplier based on normal distribution approximation
        z_multiplier = 1.96 if confidence_level == 0.95 else 1.645
        half_widths = z_multiplier * self.residual_stds

        lower = np.clip(preds - half_widths, a_min=0.0, a_max=150.0)
        upper = np.clip(preds + half_widths, a_min=0.0, a_max=150.0)

        return preds, lower, upper

    def get_feature_importances(self, top_k: int = 5) -> Dict[str, Dict[str, Any]]:
        """Extract top driving features per horizon from normalized coefficients."""
        if not self.is_fitted:
            raise RuntimeError("Model must be fitted to extract feature importances.")

        # self.model.coef_ has shape (4, D)
        coefs = self.model.coef_
        importances: Dict[str, Dict[str, Any]] = {}

        for h_idx, horizon in enumerate(self.HORIZONS):
            h_coefs = coefs[h_idx]
            indexed = list(zip(self.feature_names, h_coefs))
            sorted_by_mag = sorted(indexed, key=lambda x: abs(x[1]), reverse=True)

            top_pos = [(f, float(c)) for f, c in sorted(indexed, key=lambda x: x[1], reverse=True)[:top_k]]
            top_neg = [(f, float(c)) for f, c in sorted(indexed, key=lambda x: x[1])[:top_k]]

            importances[f"{horizon}m"] = {
                "residual_std_kmh": float(self.residual_stds[h_idx]),
                "top_influential_features": [(f, round(float(c), 4)) for f, c in sorted_by_mag[:top_k]],
                "top_positive_features": top_pos,
                "top_negative_features": top_neg,
            }

        return importances
