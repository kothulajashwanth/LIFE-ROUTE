"""Network Propagation Pipeline Runner and Artifact Generator.

Coordinates:
1. Loading road network graph, signal plans, and turn restrictions
2. Processing detections and Step 6 forecasts
3. Identifying bottleneck seeds and executing multi-hop BFS traversal
4. Conducting descriptive observational verification against future sensor measurements
5. Exporting predictions, metadata, and markdown report
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
import pandas as pd

from ai.network.evaluation import ObservationalVerificationSummary, PropagationObservationalEvaluator
from ai.network.graph import RoadNetworkGraph
from ai.network.propagation import NetworkPropagationEngine

logger = logging.getLogger(__name__)


def run_network_propagation_pipeline(
    detections_path: Path,
    forecasts_path: Optional[Path] = None,
    graph: Optional[RoadNetworkGraph] = None,
    max_timestamps: Optional[int] = None,
) -> pd.DataFrame:
    """Execute network propagation on detections and forecasts."""
    if graph is None:
        graph = RoadNetworkGraph()

    # Load detections
    if detections_path.suffix == ".parquet":
        det_df = pd.read_parquet(detections_path)
    else:
        det_df = pd.read_csv(detections_path)

    # Load forecasts if available
    fc_df = None
    if forecasts_path and forecasts_path.is_file():
        if forecasts_path.suffix == ".parquet":
            fc_df = pd.read_parquet(forecasts_path)
        else:
            fc_df = pd.read_csv(forecasts_path)

    engine = NetworkPropagationEngine(graph=graph)
    return engine.run_propagation_pipeline(
        detections_df=det_df,
        forecasts_df=fc_df,
        max_timestamps=max_timestamps,
    )


def save_propagation_results(df: pd.DataFrame, output_path: Path) -> Path:
    """Save propagation predictions to Parquet with CSV fallback."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        df.to_parquet(output_path, index=False)
        logger.info("Saved propagation results to Parquet: %s", output_path)
        return output_path
    except (ImportError, ValueError, Exception) as exc:
        csv_path = output_path.with_suffix(".csv")
        logger.warning("Parquet write failed (%s). Saving as CSV fallback: %s", exc, csv_path)
        df.to_csv(csv_path, index=False)
        return csv_path


def export_propagation_metadata(
    train_summary: Dict[str, Any],
    val_summary: Dict[str, Any],
    train_eval: ObservationalVerificationSummary,
    val_eval: ObservationalVerificationSummary,
    output_path: Path,
) -> Path:
    """Export propagation metadata, assumptions, and observational audit results."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    meta = {
        "module": "ai.network.propagation",
        "engineering_assumptions": {
            "k_jam_density": "130.0 veh/km/lane (Standard Highway Capacity Manual engineering assumption)",
            "shockwave_velocity": "18.0 km/h (Standard backward queue wave speed assumption for urban networks)",
            "max_bfs_hops": 3,
            "gamma_signal_penalty": "1.2 factor applied when feeder link is signalized with green_ratio < 0.50",
            "score_thresholds": {
                "LOW_RISK": "P_score < 0.30",
                "MODERATE_PROPAGATION": "0.30 <= P_score < 0.60",
                "HIGH_SPILLBACK_IMPACT": "P_score >= 0.60",
            },
        },
        "leakage_safeguards": "Propagation computed strictly using observations and causal forecasts available at <= T.",
        "observational_verification_note": "No organizer propagation ground truth exists. Metrics represent descriptive physical observations on actual future sensor readings.",
        "train_summary": train_summary,
        "validation_summary": val_summary,
        "observational_eval_train": train_eval.to_dict(),
        "observational_eval_val": val_eval.to_dict(),
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    return output_path
