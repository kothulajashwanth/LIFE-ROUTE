"""Evidence Dossier Formatter for LIFE ROUTE Step 9.

Generates rigorous, human-readable, auditable evidence strings.
Strictly segregates and labels:
  - OBSERVED quantities (direct physical sensor & infrastructure readings)
  - DERIVED quantities (causal detection, incident alignment, forecasting, and propagation models)
  - SIMULATED quantities (BPR counterfactual travel times, queue dissipation, and footprint relief)
"""

from typing import Dict, Any


class EvidenceFormatter:
    """Formats explainable evidence, operational rationale, and engineering limitations."""

    ENGINEERING_LIMITATIONS_TEXT: str = (
        "Advisory/Simulated Only: No actual municipal signal override, physical construction, or dispatch executed. "
        "Theoretical travel times derived from standard BPR formula (alpha=0.15, beta=4.0). "
        "Queue evacuation assumes fluid discharge over explicit 15m horizon under static demand. "
        "Storage capacity assumes 130 veh/km/lane jam density. "
        "Organizer recommendation-outcome ground truth does not exist; metrics reflect decision-support analysis."
    )

    @staticmethod
    def format_trigger_evidence(
        observed_speed_kmh: float,
        observed_flow_vph: float,
        observed_queue_veh: float,
        congestion_state: str,
        incident_state: str,
        incident_type: str,
        pred_speed_15m: float,
        free_flow_speed: float,
        propagation_risk: str,
    ) -> str:
        """Construct the primary trigger evidence summary."""
        triggers = []
        if incident_state in ["INCIDENT_SUPPORTED", "ROADWORK_SUPPORTED"]:
            triggers.append(f"Incident: {incident_type} ({incident_state})")
        if congestion_state in ["CONGESTED", "SEVERE", "WATCH"]:
            triggers.append(f"Congestion: {congestion_state}")
        if free_flow_speed > 0 and pred_speed_15m < (0.65 * free_flow_speed):
            triggers.append(f"15m Forecast Drop: {pred_speed_15m:.1f} km/h vs FF {free_flow_speed:.1f} km/h")
        if propagation_risk in ["HIGH_SPILLBACK_IMPACT", "MODERATE_PROPAGATION"]:
            triggers.append(f"Spillback Risk: {propagation_risk}")
        if observed_queue_veh >= 15.0:
            triggers.append(f"Queue: {observed_queue_veh:.1f} veh")

        if not triggers:
            triggers.append(f"State: {congestion_state}; Speed: {observed_speed_kmh:.1f} km/h")

        return "; ".join(triggers)

    @staticmethod
    def format_operational_rationale(
        tier: str,
        action_type: str,
        target_segment: str,
        candidate_id: str,
        observed_speed_kmh: float,
        observed_flow_vph: float,
        observed_queue_veh: float,
        congestion_state: str,
        incident_state: str,
        pred_speed_15m: float,
        propagation_risk: str,
        sim_delay_reduction_pct: float,
        sim_queue_reduction_veh: float,
        sim_segments_relieved: int,
        cost_index: int,
        feasibility_band: str,
    ) -> str:
        """Construct detailed rationale explicitly segregating OBSERVED, DERIVED, and SIMULATED quantities."""
        observed_block = (
            f"[OBSERVED] Speed: {observed_speed_kmh:.1f} km/h, Flow: {observed_flow_vph:.0f} vph, "
            f"Queue: {observed_queue_veh:.1f} veh. "
        )

        derived_block = (
            f"[DERIVED] State: {congestion_state}, Incident: {incident_state}, "
            f"15m Speed Forecast: {pred_speed_15m:.1f} km/h, Propagation: {propagation_risk}. "
        )

        if action_type == "NO_CANDIDATE_AVAILABLE":
            simulated_block = (
                f"[SIMULATED] Zero planning candidates available in planning_candidates.csv for {target_segment}. "
                "No infrastructure intervention fabricated. Tactical upstream metering and advisory diversion recommended."
            )
        elif tier == "TACTICAL_OPERATIONAL":
            simulated_block = (
                f"[SIMULATED] Tactical action {action_type} projected to mitigate queue progression "
                f"and relieve upstream spillback risk on feeder approaches."
            )
        else:
            simulated_block = (
                f"[SIMULATED] Candidate {candidate_id} ({action_type}): Expected delay reduction: "
                f"{sim_delay_reduction_pct:.1f}%, Expected queue cleared: {sim_queue_reduction_veh:.1f} veh, "
                f"Upstream segments protected: {sim_segments_relieved}, Cost Index: {cost_index} (feasibility: {feasibility_band})."
            )

        return f"{observed_block}{derived_block}{simulated_block}"
