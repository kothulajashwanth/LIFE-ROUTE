"""Deterministic Dual-Horizon Decision & Recommendation Engine.

Evaluates traffic, anomaly, incident, forecast, propagation, and simulation evidence
to produce explainable tactical and strategic recommendations.

Strict adherence to:
1. Two decision tiers: TACTICAL_OPERATIONAL and STRATEGIC_CAPITAL.
2. Only actual candidates from planning_candidates.csv evaluated for strategic tier.
3. Target segments with no planning candidates marked strictly as NO_CANDIDATE_AVAILABLE.
4. Deterministic urgency assignment (CRITICAL impossible for normal traffic).
5. Explainability explicitly distinguishing OBSERVED, DERIVED, and SIMULATED quantities.
6. Zero fabrication of hospital/emergency facilities or municipal execution.
"""

from typing import Dict, List, Optional, Any
import numpy as np

from ai.network.graph import RoadNetworkGraph
from ai.simulation.intervention import InterventionManager, PlanningCandidate
from ai.recommendations.scoring import MCDAScorer, MCDAWeights
from ai.recommendations.evidence import EvidenceFormatter


class DecisionEngine:
    """Core decision engine generating multi-criteria recommendations."""

    def __init__(
        self,
        graph: Optional[RoadNetworkGraph] = None,
        intervention_mgr: Optional[InterventionManager] = None,
        mcda_scorer: Optional[MCDAScorer] = None,
    ):
        self.graph = graph or RoadNetworkGraph()
        self.intervention_mgr = intervention_mgr or InterventionManager()
        self.scorer = mcda_scorer or MCDAScorer()
        self.evidence_fmt = EvidenceFormatter()

    def determine_urgency(
        self,
        congestion_state: str,
        incident_state: str,
        propagation_risk: str,
        pred_speed_15m: float,
        free_flow_speed: float,
    ) -> str:
        """Assign deterministic urgency level strictly following approved rules."""
        is_normal = (congestion_state == "NORMAL") and (incident_state == "NO_INCIDENT_EVIDENCE")
        if is_normal:
            return "ADVISORY"

        # 1. CRITICAL: Confirmed incident + severe/congested state, OR severe state + high propagation risk
        if (incident_state == "INCIDENT_SUPPORTED" and congestion_state in ["CONGESTED", "SEVERE"]) or \
           (congestion_state == "SEVERE" and propagation_risk == "HIGH_SPILLBACK_IMPACT"):
            return "CRITICAL"

        # 2. HIGH: Confirmed incident OR congested state with significant forecast drop OR high propagation risk
        forecast_breakdown = (free_flow_speed > 0) and (pred_speed_15m < 0.65 * free_flow_speed)
        if (incident_state == "INCIDENT_SUPPORTED") or \
           (congestion_state == "CONGESTED" and forecast_breakdown) or \
           (propagation_risk == "HIGH_SPILLBACK_IMPACT"):
            return "HIGH"

        # 3. MEDIUM: Watch/congested warning with meaningful forecast deterioration
        forecast_decline = (free_flow_speed > 0) and (pred_speed_15m < 0.85 * free_flow_speed)
        if congestion_state in ["WATCH", "CONGESTED"] and forecast_decline:
            return "MEDIUM"

        # 4. ADVISORY: otherwise
        return "ADVISORY"

    def evaluate_tactical(
        self,
        target_segment: str,
        timestamp: str,
        observed_speed_kmh: float,
        observed_flow_vph: float,
        observed_queue_veh: float,
        congestion_state: str,
        incident_state: str,
        incident_type: str,
        lanes_blocked: int,
        pred_speed_15m: float,
        propagation_risk: str,
        urgency_level: str,
    ) -> Dict[str, Any]:
        """Generate real-time advisory tactical operational recommendation."""
        seg_info = self.graph.get_segment(target_segment)
        ff_speed = seg_info.free_flow_speed_kmh if seg_info else 50.0

        # Action resolution logic
        if incident_state == "INCIDENT_SUPPORTED" and lanes_blocked > 0:
            action = "INCIDENT_CLEARANCE_DISPATCH"
            cost_idx = 0
            feas_band = "immediate"
            exp_delay_red = 35.0
            exp_q_red = min(observed_queue_veh, 25.0)
            prot_segs = 2
        elif seg_info and seg_info.signal_id and (congestion_state in ["CONGESTED", "SEVERE"] or propagation_risk == "HIGH_SPILLBACK_IMPACT"):
            action = "SIGNAL_RETIMING"
            cost_idx = 2
            feas_band = "immediate"
            exp_delay_red = 20.0
            exp_q_red = min(observed_queue_veh, 15.0)
            prot_segs = 1
        elif propagation_risk in ["HIGH_SPILLBACK_IMPACT", "MODERATE_PROPAGATION"]:
            action = "UPSTREAM_METERING"
            cost_idx = 0
            feas_band = "immediate"
            exp_delay_red = 15.0
            exp_q_red = min(observed_queue_veh, 10.0)
            prot_segs = 2
        else:
            action = "NO_CANDIDATE_AVAILABLE"
            cost_idx = 0
            feas_band = "none"
            exp_delay_red = 0.0
            exp_q_red = 0.0
            prot_segs = 0

        # Compute tactical MCDA score
        mcda_score, _ = self.scorer.compute_score(
            delay_reduction_pct=exp_delay_red,
            queue_reduction_veh=exp_q_red,
            segments_relieved=prot_segs,
            cost_index=cost_idx,
            feasibility_band=feas_band,
        )

        trigger_evidence = self.evidence_fmt.format_trigger_evidence(
            observed_speed_kmh=observed_speed_kmh,
            observed_flow_vph=observed_flow_vph,
            observed_queue_veh=observed_queue_veh,
            congestion_state=congestion_state,
            incident_state=incident_state,
            incident_type=incident_type,
            pred_speed_15m=pred_speed_15m,
            free_flow_speed=ff_speed,
            propagation_risk=propagation_risk,
        )

        rationale = self.evidence_fmt.format_operational_rationale(
            tier="TACTICAL_OPERATIONAL",
            action_type=action,
            target_segment=target_segment,
            candidate_id="NONE",
            observed_speed_kmh=observed_speed_kmh,
            observed_flow_vph=observed_flow_vph,
            observed_queue_veh=observed_queue_veh,
            congestion_state=congestion_state,
            incident_state=incident_state,
            pred_speed_15m=pred_speed_15m,
            propagation_risk=propagation_risk,
            sim_delay_reduction_pct=exp_delay_red,
            sim_queue_reduction_veh=exp_q_red,
            sim_segments_relieved=prot_segs,
            cost_index=cost_idx,
            feasibility_band=feas_band,
        )

        return {
            "timestamp": str(timestamp),
            "target_segment": str(target_segment),
            "recommendation_tier": "TACTICAL_OPERATIONAL",
            "action_type": str(action),
            "candidate_id": "NONE",
            "urgency_level": str(urgency_level),
            "mcda_score": round(float(mcda_score), 4),
            "cost_index": int(cost_idx),
            "feasibility_band": str(feas_band),
            "expected_delay_reduction_pct": round(float(exp_delay_red), 2),
            "expected_queue_reduction_veh": round(float(exp_q_red), 2),
            "upstream_segments_protected": int(prot_segs),
            "primary_trigger_evidence": trigger_evidence,
            "operational_rationale": rationale,
            "engineering_limitations": self.evidence_fmt.ENGINEERING_LIMITATIONS_TEXT,
        }

    def evaluate_strategic(
        self,
        target_segment: str,
        timestamp: str,
        observed_speed_kmh: float,
        observed_flow_vph: float,
        observed_queue_veh: float,
        congestion_state: str,
        incident_state: str,
        incident_type: str,
        pred_speed_15m: float,
        propagation_risk: str,
        urgency_level: str,
        sim_results_lookup: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Evaluate planning candidates from planning_candidates.csv for target segment."""
        seg_info = self.graph.get_segment(target_segment)
        ff_speed = seg_info.free_flow_speed_kmh if seg_info else 50.0

        candidates = self.intervention_mgr.get_candidates_for_segment(target_segment)
        recommendations: List[Dict[str, Any]] = []

        trigger_evidence = self.evidence_fmt.format_trigger_evidence(
            observed_speed_kmh=observed_speed_kmh,
            observed_flow_vph=observed_flow_vph,
            observed_queue_veh=observed_queue_veh,
            congestion_state=congestion_state,
            incident_state=incident_state,
            incident_type=incident_type,
            pred_speed_15m=pred_speed_15m,
            free_flow_speed=ff_speed,
            propagation_risk=propagation_risk,
        )

        if not candidates:
            # Strictly emit NO_CANDIDATE_AVAILABLE when no real candidate exists
            rationale = self.evidence_fmt.format_operational_rationale(
                tier="STRATEGIC_CAPITAL",
                action_type="NO_CANDIDATE_AVAILABLE",
                target_segment=target_segment,
                candidate_id="NONE",
                observed_speed_kmh=observed_speed_kmh,
                observed_flow_vph=observed_flow_vph,
                observed_queue_veh=observed_queue_veh,
                congestion_state=congestion_state,
                incident_state=incident_state,
                pred_speed_15m=pred_speed_15m,
                propagation_risk=propagation_risk,
                sim_delay_reduction_pct=0.0,
                sim_queue_reduction_veh=0.0,
                sim_segments_relieved=0,
                cost_index=0,
                feasibility_band="none",
            )
            recommendations.append({
                "timestamp": str(timestamp),
                "target_segment": str(target_segment),
                "recommendation_tier": "STRATEGIC_CAPITAL",
                "action_type": "NO_CANDIDATE_AVAILABLE",
                "candidate_id": "NONE",
                "urgency_level": str(urgency_level),
                "mcda_score": 0.0,
                "cost_index": 0,
                "feasibility_band": "none",
                "expected_delay_reduction_pct": 0.0,
                "expected_queue_reduction_veh": 0.0,
                "upstream_segments_protected": 0,
                "primary_trigger_evidence": trigger_evidence,
                "operational_rationale": rationale,
                "engineering_limitations": self.evidence_fmt.ENGINEERING_LIMITATIONS_TEXT,
            })
            return recommendations

        for cand in candidates:
            action = cand.intervention_type.upper()
            cand_id = cand.candidate_id
            cost_idx = cand.cost_index
            feas_band = cand.feasibility_band

            # Use simulation results if available for this candidate
            sim_record = (sim_results_lookup or {}).get(cand_id, {})
            exp_delay_red = float(sim_record.get("delay_reduction_pct", 15.0 + 5.0 * (cand.capacity_delta_vph / 250.0)))
            exp_q_red = float(sim_record.get("queue_reduction_veh", cand.capacity_delta_vph * (15.0 / 60.0)))
            prot_segs = int(sim_record.get("segments_relieved", 1 if cand.capacity_delta_vph >= 500 else 0))

            mcda_score, _ = self.scorer.compute_score(
                delay_reduction_pct=exp_delay_red,
                queue_reduction_veh=exp_q_red,
                segments_relieved=prot_segs,
                cost_index=cost_idx,
                feasibility_band=feas_band,
            )

            rationale = self.evidence_fmt.format_operational_rationale(
                tier="STRATEGIC_CAPITAL",
                action_type=action,
                target_segment=target_segment,
                candidate_id=cand_id,
                observed_speed_kmh=observed_speed_kmh,
                observed_flow_vph=observed_flow_vph,
                observed_queue_veh=observed_queue_veh,
                congestion_state=congestion_state,
                incident_state=incident_state,
                pred_speed_15m=pred_speed_15m,
                propagation_risk=propagation_risk,
                sim_delay_reduction_pct=exp_delay_red,
                sim_queue_reduction_veh=exp_q_red,
                sim_segments_relieved=prot_segs,
                cost_index=cost_idx,
                feasibility_band=feas_band,
            )

            recommendations.append({
                "timestamp": str(timestamp),
                "target_segment": str(target_segment),
                "recommendation_tier": "STRATEGIC_CAPITAL",
                "action_type": str(action),
                "candidate_id": str(cand_id),
                "urgency_level": str(urgency_level),
                "mcda_score": round(float(mcda_score), 4),
                "cost_index": int(cost_idx),
                "feasibility_band": str(feas_band),
                "expected_delay_reduction_pct": round(float(exp_delay_red), 2),
                "expected_queue_reduction_veh": round(float(exp_q_red), 2),
                "upstream_segments_protected": int(prot_segs),
                "primary_trigger_evidence": trigger_evidence,
                "operational_rationale": rationale,
                "engineering_limitations": self.evidence_fmt.ENGINEERING_LIMITATIONS_TEXT,
            })

        return recommendations
