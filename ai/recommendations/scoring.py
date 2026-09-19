"""Multi-Criteria Decision Analysis (MCDA) Scoring Engine for Step 9.

Deterministic, transparent scoring of candidate interventions using fixed,
pre-declared engineering weights.

Weights are explicitly documented engineering decision-support constants:
    w_delay  = 0.35 (Theoretical travel delay savings benefit)
    w_queue  = 0.20 (Simulated queue evacuation benefit)
    w_relief = 0.20 (Upstream network propagation protection benefit)
    w_cost   = 0.15 (Ordinal capital/operational expenditure penalty)
    w_feas   = 0.10 (Regulatory, planning, and civil feasibility penalty)

SUM OF WEIGHTS = 1.00 EXACTLY.

Weights are NEVER trained or optimized on validation datasets.
Zero machine learning black-box parameters.
"""

from dataclasses import dataclass
from typing import Dict, Any, Tuple


@dataclass(frozen=True)
class MCDAWeights:
    """Fixed, transparent engineering weights for multi-criteria evaluation."""
    w_delay: float = 0.35
    w_queue: float = 0.20
    w_relief: float = 0.20
    w_cost: float = 0.15
    w_feas: float = 0.10

    def __post_init__(self):
        total = self.w_delay + self.w_queue + self.w_relief + self.w_cost + self.w_feas
        if abs(total - 1.0) > 1e-6:
            raise ValueError(f"MCDA weights must sum to 1.0, got {total:.6f}")


class MCDAScorer:
    """Calculates deterministic MCDA scores bounded strictly within [0.0, 1.0]."""

    # Feasibility penalty mapping: low=0.0 (minimal friction), medium=0.5, high=1.0 (major regulatory/civil hurdle)
    FEASIBILITY_PENALTY_MAP: Dict[str, float] = {
        "low": 0.0,
        "medium": 0.5,
        "high": 1.0,
        "immediate": 0.0,  # Operational tactical actions
        "none": 0.0,
    }

    # Reference bounds for normalization (based on Step 8 physical ranges)
    MAX_DELAY_RED_PCT: float = 100.0
    MAX_QUEUE_RED_VEH: float = 50.0
    MAX_SEGMENTS_RELIEVED: float = 5.0
    MIN_COST_INDEX: float = 2.0
    MAX_COST_INDEX: float = 18.0

    def __init__(self, weights: MCDAWeights = MCDAWeights()):
        self.weights = weights
        self.w_benefit = self.weights.w_delay + self.weights.w_queue + self.weights.w_relief  # 0.75
        self.w_penalty = self.weights.w_cost + self.weights.w_feas                            # 0.25

    def normalize_components(
        self,
        delay_reduction_pct: float,
        queue_reduction_veh: float,
        segments_relieved: int,
        cost_index: int,
        feasibility_band: str,
    ) -> Dict[str, float]:
        """Normalize raw benefit and penalty components to [0.0, 1.0]."""
        # Benefits: monotonic increase in benefit
        norm_delay = min(1.0, max(0.0, float(delay_reduction_pct) / self.MAX_DELAY_RED_PCT))
        norm_queue = min(1.0, max(0.0, float(queue_reduction_veh) / self.MAX_QUEUE_RED_VEH))
        norm_relief = min(1.0, max(0.0, float(segments_relieved) / self.MAX_SEGMENTS_RELIEVED))

        # Cost penalty: normalized from [2, 18] -> [0.0, 1.0]
        if cost_index <= 0:
            norm_cost = 0.0
        else:
            norm_cost = min(1.0, max(0.0, (float(cost_index) - self.MIN_COST_INDEX) / (self.MAX_COST_INDEX - self.MIN_COST_INDEX)))

        # Feasibility penalty
        feas_key = str(feasibility_band).strip().lower()
        norm_feas = self.FEASIBILITY_PENALTY_MAP.get(feas_key, 0.5)

        return {
            "norm_delay_benefit": norm_delay,
            "norm_queue_benefit": norm_queue,
            "norm_relief_benefit": norm_relief,
            "norm_cost_penalty": norm_cost,
            "norm_feas_penalty": norm_feas,
        }

    def compute_score(
        self,
        delay_reduction_pct: float,
        queue_reduction_veh: float,
        segments_relieved: int,
        cost_index: int,
        feasibility_band: str,
    ) -> Tuple[float, Dict[str, Any]]:
        """Compute transparent, deterministic MCDA score in [0.0, 1.0].
        
        Formulation:
            benefit = w_delay * norm_delay + w_queue * norm_queue + w_relief * norm_relief
            penalty = w_cost * norm_cost + w_feas * norm_feas
            mcda_raw = benefit - penalty
            mcda_score = clamp(mcda_raw + w_penalty, 0.0, 1.0)
            
        Returns:
            Tuple of (mcda_score: float, audit_details: dict)
        """
        norm = self.normalize_components(
            delay_reduction_pct=delay_reduction_pct,
            queue_reduction_veh=queue_reduction_veh,
            segments_relieved=segments_relieved,
            cost_index=cost_index,
            feasibility_band=feasibility_band,
        )

        benefit = (
            self.weights.w_delay * norm["norm_delay_benefit"]
            + self.weights.w_queue * norm["norm_queue_benefit"]
            + self.weights.w_relief * norm["norm_relief_benefit"]
        )

        penalty = (
            self.weights.w_cost * norm["norm_cost_penalty"]
            + self.weights.w_feas * norm["norm_feas_penalty"]
        )

        mcda_raw = benefit - penalty

        # Normalized mapping: when benefit=1 and penalty=0 -> score=1.0; when benefit=0 and penalty=1 -> score=0.0
        mcda_score = max(0.0, min(1.0, (mcda_raw + self.w_penalty) / (self.w_benefit + self.w_penalty)))

        audit_details = {
            "weights": {
                "w_delay": self.weights.w_delay,
                "w_queue": self.weights.w_queue,
                "w_relief": self.weights.w_relief,
                "w_cost": self.weights.w_cost,
                "w_feas": self.weights.w_feas,
            },
            "normalized_components": norm,
            "aggregate_benefit": round(benefit, 4),
            "aggregate_penalty": round(penalty, 4),
            "mcda_raw": round(mcda_raw, 4),
            "final_mcda_score": round(mcda_score, 4),
        }

        return round(float(mcda_score), 4), audit_details
