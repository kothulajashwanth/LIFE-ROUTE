"""Observational Verification and Descriptive Audit for Network Propagation.

Important Protocol:
There is NO organizer propagation ground truth dataset.
Therefore, this module NEVER claims 'accuracy', 'precision', or 'ground-truth score'.

Instead, it performs purely descriptive OBSERVATIONAL VERIFICATION:
For upstream feeder links flagged as HIGH_SPILLBACK_IMPACT or MODERATE_PROPAGATION at time T,
it checks subsequent sensor observations in traffic datasets at T+15m and T+30m to observe
real physical speed changes, queue evolutions, and congestion states.
"""

from dataclasses import asdict, dataclass
import logging
from typing import Any, Dict, List
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class ObservationalVerificationSummary:
    """Descriptive outcome metrics from observing flagged segments at future intervals."""

    flagged_events_audited: int
    matched_future_observations: int
    observed_speed_deterioration_count: int
    observed_speed_deterioration_pct: float
    observed_queue_growth_count: int
    observed_queue_growth_pct: float
    observed_congestion_or_watch_count: int
    observed_congestion_or_watch_pct: float
    mean_speed_drop_kmh: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class PropagationObservationalEvaluator:
    """Verifies physical consequence of flagged propagation events against future observations."""

    @staticmethod
    def verify_propagation_events(
        propagation_df: pd.DataFrame,
        traffic_df: pd.DataFrame,
        sample_size: int = 5000,
    ) -> ObservationalVerificationSummary:
        """Measure real descriptive outcomes on flagged segments at T+15m and T+30m.

        Strictly evaluation-only: does NOT feed future data back into prediction.
        """
        if len(propagation_df) == 0:
            return ObservationalVerificationSummary(
                flagged_events_audited=0,
                matched_future_observations=0,
                observed_speed_deterioration_count=0,
                observed_speed_deterioration_pct=0.0,
                observed_queue_growth_count=0,
                observed_queue_growth_pct=0.0,
                observed_congestion_or_watch_count=0,
                observed_congestion_or_watch_pct=0.0,
                mean_speed_drop_kmh=0.0,
            )

        # Focus on upstream spillback events
        upstream_events = propagation_df[propagation_df["direction"] == "UPSTREAM_SPILLBACK"]
        if len(upstream_events) > sample_size:
            sample_df = upstream_events.sample(n=sample_size, random_state=42)
        else:
            sample_df = upstream_events

        # Create quick lookup on traffic data: (timestamp, segment_id) -> speed, queue, congestion
        t_lookup = traffic_df.set_index(["timestamp", "segment_id"])

        matched = 0
        speed_drops = 0
        queue_growths = 0
        congested_states = 0
        speed_deltas: List[float] = []

        for _, ev in sample_df.iterrows():
            t_orig = pd.to_datetime(ev["timestamp"])
            seg = ev["propagated_segment_id"]
            h_min = int(ev.get("horizon_min", 15))

            t_future = str(t_orig + pd.Timedelta(minutes=h_min))
            t_curr = str(t_orig)

            if (t_future, seg) in t_lookup.index and (t_curr, seg) in t_lookup.index:
                matched += 1
                row_future = t_lookup.loc[(t_future, seg)]
                row_curr = t_lookup.loc[(t_curr, seg)]

                spd_curr = float(row_curr.get("speed_kmh", 50.0))
                spd_fut = float(row_future.get("speed_kmh", 50.0))
                q_curr = float(row_curr.get("queue_length_veh", 0.0))
                q_fut = float(row_future.get("queue_length_veh", 0.0))
                st_fut = str(row_future.get("congestion_state", "NORMAL"))

                d_spd = spd_fut - spd_curr
                speed_deltas.append(d_spd)

                if d_spd < -2.0:
                    speed_drops += 1
                if q_fut > q_curr:
                    queue_growths += 1
                if st_fut in ["WATCH", "CONGESTED", "SEVERE"]:
                    congested_states += 1

        n_audited = len(sample_df)
        spd_drop_pct = (speed_drops / matched * 100.0) if matched > 0 else 0.0
        q_growth_pct = (queue_growths / matched * 100.0) if matched > 0 else 0.0
        cong_pct = (congested_states / matched * 100.0) if matched > 0 else 0.0
        mean_drop = float(np.mean([d for d in speed_deltas if d < 0])) if any(d < 0 for d in speed_deltas) else 0.0

        return ObservationalVerificationSummary(
            flagged_events_audited=n_audited,
            matched_future_observations=matched,
            observed_speed_deterioration_count=speed_drops,
            observed_speed_deterioration_pct=round(spd_drop_pct, 2),
            observed_queue_growth_count=queue_growths,
            observed_queue_growth_pct=round(q_growth_pct, 2),
            observed_congestion_or_watch_count=congested_states,
            observed_congestion_or_watch_pct=round(cong_pct, 2),
            mean_speed_drop_kmh=round(abs(mean_drop), 2),
        )
