"""Fluid Queue Storage-Discharge Model & Spillback Calculator.

Formulation:
    Queue discharge over horizon delta_t (minutes):
        delta_Q = capacity_delta_vph * (delta_t / 60)
        Q_counter = max(0.0, Q_base - delta_Q)

    Storage Capacity:
        Storage_veh = length_km * lanes * k_jam
        where k_jam = 130.0 veh/km/lane (HCM Engineering Assumption)

    Spillback Risk (Step 7 formulation):
        R_spillback = (Q_seed / Storage_seed) * (flow_upstream / capacity_upstream) * (1 - green_ratio)
        clamped to [0.0, 1.0]
"""

from typing import Dict, Any


class QueueModel:
    """Calculates counterfactual queue lengths, storage capacity, and spillback risks."""

    def __init__(
        self,
        delta_t_minutes: float = 15.0,
        k_jam: float = 130.0,
    ):
        """Initialize queue model with explicit engineering assumptions.
        
        Args:
            delta_t_minutes: Simulation horizon in minutes (default 15.0 min).
            k_jam: Jam density in veh/km/lane (HCM default 130.0).
        """
        self.delta_t_minutes = float(delta_t_minutes)
        self.k_jam = float(k_jam)

    def calculate_storage_capacity(self, length_km: float, lanes: int) -> float:
        """Calculate maximum physical vehicle storage on segment."""
        if length_km <= 0 or lanes <= 0:
            return 1.0
        return max(1.0, length_km * lanes * self.k_jam)

    def calculate_counterfactual_queue(
        self,
        baseline_queue_veh: float,
        capacity_delta_vph: float,
    ) -> float:
        """Calculate expected queue remaining after horizon delta_t under expanded capacity."""
        if baseline_queue_veh <= 0:
            return 0.0
        
        # Additional vehicle discharge capability over delta_t minutes
        discharge_relief = capacity_delta_vph * (self.delta_t_minutes / 60.0)
        counterfactual_queue = max(0.0, baseline_queue_veh - discharge_relief)
        return float(counterfactual_queue)

    def calculate_spillback_risk(
        self,
        queue_veh: float,
        storage_veh: float,
        feeder_flow_vph: float,
        feeder_capacity_vph: float,
        green_ratio: float = 0.50,
    ) -> float:
        """Calculate upstream spillback risk exactly matching Step 7 formulation."""
        if storage_veh <= 0:
            storage_veh = 1.0
        if feeder_capacity_vph <= 0:
            feeder_capacity_vph = 1800.0

        ratio_storage = min(2.0, max(0.0, queue_veh) / storage_veh)
        ratio_utilization = min(2.0, max(0.0, feeder_flow_vph) / feeder_capacity_vph)
        signal_factor = max(0.1, 1.0 - min(0.9, max(0.1, green_ratio)))

        spillback_risk = ratio_storage * ratio_utilization * signal_factor
        return float(min(1.0, max(0.0, spillback_risk)))
