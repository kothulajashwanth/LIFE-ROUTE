"""Intervention Candidate Loader and State Mutator.

Loads organizer planning candidates and calculates modified link capacity and lanes.
STRICT RULE: Only simulate actual candidates present in dataset/raw/planning_candidates.csv.
Do not fabricate candidates.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Any
import pandas as pd


@dataclass
class PlanningCandidate:
    """Represents a validated organizer planning candidate."""
    candidate_id: str
    target_segment: str
    intervention_type: str
    capacity_delta_vph: int
    cost_index: int
    feasibility_band: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "candidate_id": self.candidate_id,
            "target_segment": self.target_segment,
            "intervention_type": self.intervention_type,
            "capacity_delta_vph": self.capacity_delta_vph,
            "cost_index": self.cost_index,
            "feasibility_band": self.feasibility_band,
        }


class InterventionManager:
    """Manages planning candidates and applies parameter updates for simulation."""

    SUPPORTED_TYPES = {
        "signal_retiming",
        "turn_lane",
        "capacity_upgrade",
        "lane_addition",
        "connector",
    }

    def __init__(self, candidates_file: Optional[Path] = None):
        """Initialize and load candidates from CSV."""
        if candidates_file is None:
            candidates_file = Path("dataset/raw/planning_candidates.csv")
        self.candidates_file = Path(candidates_file)
        self.candidates_by_segment: Dict[str, List[PlanningCandidate]] = {}
        self.all_candidates: List[PlanningCandidate] = []
        self._load_candidates()

    def _load_candidates(self) -> None:
        """Load and index planning candidates from file."""
        if not self.candidates_file.exists():
            raise FileNotFoundError(f"Planning candidates file not found: {self.candidates_file}")

        df = pd.read_csv(self.candidates_file)
        required_cols = {
            "candidate_id",
            "target_segment",
            "intervention_type",
            "capacity_delta_vph",
            "cost_index",
            "feasibility_band",
        }
        if not required_cols.issubset(df.columns):
            raise ValueError(f"Candidates file missing required columns: {required_cols - set(df.columns)}")

        for _, row in df.iterrows():
            cand_type = str(row["intervention_type"]).strip()
            if cand_type not in self.SUPPORTED_TYPES:
                raise ValueError(f"Unsupported candidate type encountered: {cand_type}")

            cand = PlanningCandidate(
                candidate_id=str(row["candidate_id"]).strip(),
                target_segment=str(row["target_segment"]).strip(),
                intervention_type=cand_type,
                capacity_delta_vph=int(row["capacity_delta_vph"]),
                cost_index=int(row["cost_index"]),
                feasibility_band=str(row["feasibility_band"]).strip().lower(),
            )
            self.all_candidates.append(cand)
            if cand.target_segment not in self.candidates_by_segment:
                self.candidates_by_segment[cand.target_segment] = []
            self.candidates_by_segment[cand.target_segment].append(cand)

    def get_candidates_for_segment(self, segment_id: str) -> List[PlanningCandidate]:
        """Return all matching planning candidates for target segment."""
        return self.candidates_by_segment.get(segment_id, [])

    def apply_intervention(
        self,
        candidate: PlanningCandidate,
        baseline_capacity_vph: float,
        baseline_lanes: int,
    ) -> Dict[str, Any]:
        """Calculate counterfactual capacity and lanes resulting from candidate."""
        counterfactual_capacity = float(baseline_capacity_vph + candidate.capacity_delta_vph)
        
        if candidate.intervention_type == "lane_addition":
            counterfactual_lanes = int(baseline_lanes + 1)
        else:
            counterfactual_lanes = int(baseline_lanes)

        return {
            "counterfactual_capacity_vph": counterfactual_capacity,
            "counterfactual_lanes": counterfactual_lanes,
            "capacity_delta_vph": candidate.capacity_delta_vph,
            "cost_index": candidate.cost_index,
            "feasibility_band": candidate.feasibility_band,
            "intervention_type": candidate.intervention_type,
        }
