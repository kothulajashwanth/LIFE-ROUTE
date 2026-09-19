"""Propagation scoring and physical shockwave estimation formulas.

Implements approved engineering formulas:
1. Storage capacity: length * lanes * k_jam (k_jam = 130 veh/km/lane assumption)
2. Spillback risk: (Q_seed / Storage_seed) * (flow_upstream / cap_upstream) * (1 - green_ratio)
3. Multi-hop propagation risk score P_score bounded in [0.0, 1.0]
4. Distance-based shockwave travel time mapped to discrete horizons (15, 30, 45, 60m)
"""

from typing import Tuple
import numpy as np


class PropagationScorer:
    """Calculates risk scores, spillback metrics, and arrival horizons."""

    # Explicit engineering assumption: shockwave propagation velocity in urban arterials (km/h)
    SHOCKWAVE_SPEED_KMH_ASSUMPTION: float = 18.0

    @staticmethod
    def compute_spillback_risk(
        q_seed: float,
        storage_seed: float,
        flow_upstream: float,
        capacity_upstream: float,
        green_ratio_upstream: float,
    ) -> float:
        """Compute upstream queue spillback risk factor."""
        storage_safe = max(storage_seed, 5.0)
        cap_safe = max(capacity_upstream, 100.0)

        q_ratio = min(q_seed / storage_safe, 2.0)
        util_upstream = min(flow_upstream / cap_safe, 2.0)
        red_factor = max(0.0, 1.0 - min(green_ratio_upstream, 1.0))

        risk = q_ratio * util_upstream * red_factor
        return float(np.clip(risk, 0.0, 2.0))

    @staticmethod
    def compute_propagation_score(
        s_seed: float,
        hop: int,
        flow_feeder: float,
        capacity_feeder: float,
        is_signalized: bool,
        green_ratio: float,
    ) -> Tuple[float, str]:
        """Compute multi-hop propagation score P_score and discrete risk level.

        Formula:
            P_score = clip(S_seed * (1 - 0.25 * (hop - 1)) * utilization_feeder * gamma_signal, 0, 1)

        Returns:
            Tuple of (P_score: float, risk_level: str)
        """
        hop_attenuation = max(0.0, 1.0 - 0.25 * (hop - 1))
        cap_safe = max(capacity_feeder, 100.0)
        utilization_feeder = max(0.0, flow_feeder / cap_safe)

        # Gamma signal penalty: 1.2 if signalized and green_ratio < 0.50, else 1.0
        gamma_signal = 1.2 if (is_signalized and green_ratio < 0.50) else 1.0

        raw_score = s_seed * hop_attenuation * utilization_feeder * gamma_signal
        p_score = float(np.clip(raw_score, 0.0, 1.0))

        if p_score < 0.30:
            risk_level = "LOW_RISK"
        elif p_score < 0.60:
            risk_level = "MODERATE_PROPAGATION"
        else:
            risk_level = "HIGH_SPILLBACK_IMPACT"

        return round(p_score, 4), risk_level

    @classmethod
    def estimate_horizon(cls, cumulative_distance_km: float) -> int:
        """Estimate arrival horizon (15, 30, 45, 60 min) based on distance and shockwave speed."""
        time_minutes = (cumulative_distance_km / cls.SHOCKWAVE_SPEED_KMH_ASSUMPTION) * 60.0

        if time_minutes <= 22.5:
            return 15
        elif time_minutes <= 37.5:
            return 30
        elif time_minutes <= 52.5:
            return 45
        else:
            return 60
