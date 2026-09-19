"""Bureau of Public Roads (BPR) Link Congestion & Travel Time Calculator.

Standard Traffic Flow Formulation:
    t = (L / v_ff) * [1 + alpha * (q / C)^beta]

Where:
    L: segment length in km
    v_ff: free-flow speed in km/h
    q: traffic volume/flow in vehicles/hour
    C: link capacity in vehicles/hour
    alpha: congestion coefficient (standard default = 0.15, Engineering Assumption)
    beta: congestion power exponent (standard default = 4.0, Engineering Assumption)

Simulated Operating Speed:
    v_sim = L / t_hours (clamped to free_flow_speed)

Delay:
    delay = max(0.0, (t - t_free) * 3600) in seconds
"""

import math
from typing import Dict, Any


class BPRCalculator:
    """Calculates theoretical baseline and counterfactual travel times and delays."""

    def __init__(self, alpha: float = 0.15, beta: float = 4.0):
        """Initialize BPR calculator with explicit engineering assumptions."""
        self.alpha = float(alpha)
        self.beta = float(beta)

    def calculate_travel_time_hours(
        self,
        length_km: float,
        free_flow_speed_kmh: float,
        flow_vph: float,
        capacity_vph: float,
    ) -> float:
        """Calculate link travel time in hours.
        
        Args:
            length_km: Segment length in km.
            free_flow_speed_kmh: Free-flow speed in km/h.
            flow_vph: Traffic flow in vehicles per hour.
            capacity_vph: Practical capacity in vehicles per hour.
            
        Returns:
            Travel time in hours.
        """
        if length_km <= 0 or free_flow_speed_kmh <= 0 or capacity_vph <= 0:
            return 0.0
            
        t_free_hours = length_km / free_flow_speed_kmh
        utilization = max(0.0, flow_vph) / capacity_vph
        
        # BPR standard equation
        t_hours = t_free_hours * (1.0 + self.alpha * math.pow(utilization, self.beta))
        return float(t_hours)

    def evaluate_intervention(
        self,
        length_km: float,
        free_flow_speed_kmh: float,
        flow_vph: float,
        baseline_capacity_vph: float,
        counterfactual_capacity_vph: float,
    ) -> Dict[str, float]:
        """Compute before vs after BPR performance metrics.
        
        Returns a dictionary containing:
            baseline_theoretical_travel_time_min
            counterfactual_theoretical_travel_time_min
            free_flow_travel_time_min
            baseline_theoretical_speed_kmh
            counterfactual_theoretical_speed_kmh
            speed_delta_kmh
            baseline_delay_s
            counterfactual_delay_s
            delay_reduction_s
            delay_reduction_pct
            baseline_utilization
            counterfactual_utilization
        """
        if length_km <= 0 or free_flow_speed_kmh <= 0:
            return {
                "baseline_theoretical_travel_time_min": 0.0,
                "counterfactual_theoretical_travel_time_min": 0.0,
                "free_flow_travel_time_min": 0.0,
                "baseline_theoretical_speed_kmh": free_flow_speed_kmh,
                "counterfactual_theoretical_speed_kmh": free_flow_speed_kmh,
                "speed_delta_kmh": 0.0,
                "baseline_delay_s": 0.0,
                "counterfactual_delay_s": 0.0,
                "delay_reduction_s": 0.0,
                "delay_reduction_pct": 0.0,
                "baseline_utilization": 0.0,
                "counterfactual_utilization": 0.0,
            }

        t_free_hours = length_km / free_flow_speed_kmh
        t_free_min = t_free_hours * 60.0

        t_base_hours = self.calculate_travel_time_hours(
            length_km, free_flow_speed_kmh, flow_vph, baseline_capacity_vph
        )
        t_counter_hours = self.calculate_travel_time_hours(
            length_km, free_flow_speed_kmh, flow_vph, counterfactual_capacity_vph
        )

        t_base_min = t_base_hours * 60.0
        t_counter_min = t_counter_hours * 60.0

        # Simulated speeds (km/h), clamped to free flow speed
        v_base_sim = min(free_flow_speed_kmh, length_km / t_base_hours) if t_base_hours > 0 else free_flow_speed_kmh
        v_counter_sim = min(free_flow_speed_kmh, length_km / t_counter_hours) if t_counter_hours > 0 else free_flow_speed_kmh
        speed_delta_kmh = max(0.0, v_counter_sim - v_base_sim)

        # Delays relative to free flow time (in seconds)
        delay_base_s = max(0.0, (t_base_hours - t_free_hours) * 3600.0)
        delay_counter_s = max(0.0, (t_counter_hours - t_free_hours) * 3600.0)
        delay_reduction_s = max(0.0, delay_base_s - delay_counter_s)

        if delay_base_s > 1e-6:
            delay_reduction_pct = (delay_reduction_s / delay_base_s) * 100.0
        else:
            delay_reduction_pct = 0.0

        util_base = flow_vph / baseline_capacity_vph if baseline_capacity_vph > 0 else 0.0
        util_counter = flow_vph / counterfactual_capacity_vph if counterfactual_capacity_vph > 0 else 0.0

        return {
            "baseline_theoretical_travel_time_min": round(t_base_min, 4),
            "counterfactual_theoretical_travel_time_min": round(t_counter_min, 4),
            "free_flow_travel_time_min": round(t_free_min, 4),
            "baseline_theoretical_speed_kmh": round(v_base_sim, 2),
            "counterfactual_theoretical_speed_kmh": round(v_counter_sim, 2),
            "speed_delta_kmh": round(speed_delta_kmh, 2),
            "baseline_delay_s": round(delay_base_s, 2),
            "counterfactual_delay_s": round(delay_counter_s, 2),
            "delay_reduction_s": round(delay_reduction_s, 2),
            "delay_reduction_pct": round(delay_reduction_pct, 2),
            "baseline_utilization": round(util_base, 4),
            "counterfactual_utilization": round(util_counter, 4),
        }
