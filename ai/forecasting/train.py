"""Model training orchestration for traffic forecasting.

Fits multi-horizon regressor strictly on training split data without
access to validation observations or future targets.
"""

import logging
from pathlib import Path
from typing import Dict, Tuple
import numpy as np

from ai.forecasting.baseline import PersistenceBaseline
from ai.forecasting.evaluation import ForecastComparison, ForecastEvaluator, HorizonMetrics
from ai.forecasting.features import ForecastingFeatureBuilder
from ai.forecasting.model import TrafficForecaster

logger = logging.getLogger(__name__)


def train_forecasting_pipeline(
    train_features_path: Path,
    train_targets_path: Path,
    alpha: float = 10.0,
) -> Tuple[TrafficForecaster, Dict[str, HorizonMetrics], Dict[str, ForecastComparison], ForecastingFeatureBuilder]:
    """Train the multi-horizon forecasting pipeline on organizer training data.

    Returns:
        Tuple of (fitted_model, train_metrics, baseline_comparisons, feature_builder)
    """
    logger.info("Initializing ForecastingFeatureBuilder...")
    builder = ForecastingFeatureBuilder()

    logger.info("Loading and aligning training features with targets...")
    aligned_train, X_train, Y_train, feature_names = builder.load_and_align_dataset(
        features_path=train_features_path,
        targets_path=train_targets_path,
    )
    logger.info("Training feature matrix shape: %s, targets shape: %s", X_train.shape, Y_train.shape)

    # 1. Baseline evaluation on train
    persistence = PersistenceBaseline()
    Y_base_train = persistence.predict(aligned_train, value_col="speed_kmh")

    # 2. Fit ML Forecaster
    logger.info("Fitting TrafficForecaster (Ridge alpha=%.1f)...", alpha)
    forecaster = TrafficForecaster(alpha=alpha)
    forecaster.fit(X_train, Y_train, feature_names=feature_names)

    # 3. Predict on training set
    Y_pred_train = forecaster.predict(X_train)

    # 4. Compute metrics and comparisons
    train_metrics = ForecastEvaluator.compute_metrics(Y_train, Y_pred_train)
    comparisons = ForecastEvaluator.compare_against_baseline(Y_train, Y_base_train, Y_pred_train)

    logger.info("Model training complete.")
    return forecaster, train_metrics, comparisons, builder
