"""LIFE ROUTE Step 9: Decision & Recommendation Engine Package.

Deterministic, multi-criteria tactical and strategic decision support.
"""

from ai.recommendations.scoring import MCDAScorer, MCDAWeights
from ai.recommendations.evidence import EvidenceFormatter
from ai.recommendations.decision_engine import DecisionEngine
from ai.recommendations.validation import RecommendationPipeline

__all__ = [
    "MCDAScorer",
    "MCDAWeights",
    "EvidenceFormatter",
    "DecisionEngine",
    "RecommendationPipeline",
]
