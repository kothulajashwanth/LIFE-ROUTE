"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Sliders,
  RefreshCw,
  AlertCircle,
  FlaskConical,
  ShieldCheck,
} from "lucide-react";
import { Panel } from "../ui/Panel";
import { SimulationControls } from "./SimulationControls";
import { SimulationComparison } from "./SimulationComparison";
import {
  SimulationRunRequest,
  SimulationRunResponse,
  AvailableCandidate,
} from "@/types/simulation";
import { RecommendationRecord } from "@/types/recommendations";
import { TrafficRecord } from "@/types/traffic";
import { runSimulation } from "@/lib/api/simulation";
import { ApiClientError } from "@/lib/api/client";

interface SimulationPanelProps {
  recommendationRecords?: RecommendationRecord[];
  trafficRecords?: TrafficRecord[];
  selectedSegmentId?: string | null;
  onSelectSegment?: (segmentId: string | null) => void;
}

export function SimulationPanel({
  recommendationRecords = [],
  trafficRecords = [],
  selectedSegmentId,
  onSelectSegment,
}: SimulationPanelProps) {
  // Extract real planning candidates from backend recommendations
  const availableCandidates: AvailableCandidate[] = useMemo(() => {
    const list: AvailableCandidate[] = [];
    const seen = new Set<string>();

    for (const rec of recommendationRecords) {
      if (
        rec.candidate_id &&
        rec.candidate_id !== "NONE" &&
        rec.action_type !== "NO_CANDIDATE_AVAILABLE" &&
        !seen.has(rec.candidate_id)
      ) {
        seen.add(rec.candidate_id);
        list.push({
          candidate_id: rec.candidate_id,
          target_segment: rec.target_segment,
          intervention_type: rec.action_type.toLowerCase(),
          capacity_delta_vph:
            rec.action_type.toLowerCase() === "lane_addition"
              ? 900
              : rec.action_type.toLowerCase() === "connector"
              ? 700
              : rec.action_type.toLowerCase() === "capacity_upgrade"
              ? 500
              : rec.action_type.toLowerCase() === "turn_lane"
              ? 450
              : 250,
          cost_index: rec.cost_index,
          feasibility_band: rec.feasibility_band,
          expected_delay_reduction_pct: rec.expected_delay_reduction_pct,
          expected_queue_reduction_veh: rec.expected_queue_reduction_veh,
          primary_trigger_evidence: rec.primary_trigger_evidence,
          operational_rationale: rec.operational_rationale,
          engineering_limitations: rec.engineering_limitations,
        });
      }
    }

    return list;
  }, [recommendationRecords]);

  // All distinct segments from traffic & recommendations
  const allAvailableSegments = useMemo(() => {
    const set = new Set<string>();
    availableCandidates.forEach((c) => set.add(c.target_segment));
    trafficRecords.forEach((t) => set.add(t.segment_id));
    return Array.from(set);
  }, [availableCandidates, trafficRecords]);

  // State
  const [selectedSegment, setSelectedSegment] = useState<string>("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [scenarioId, setScenarioId] = useState<string>("USER_SIMULATION");
  const [baselineFlow, setBaselineFlow] = useState<number | undefined>(undefined);
  const [baselineSpeed, setBaselineSpeed] = useState<number | undefined>(undefined);
  const [baselineQueue, setBaselineQueue] = useState<number | undefined>(undefined);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimulationRunResponse | null>(null);

  // Sync with incoming selectedSegmentId if it has a candidate or updates
  useEffect(() => {
    if (selectedSegmentId) {
      setSelectedSegment(selectedSegmentId);
      const matchingCand = availableCandidates.find(
        (c) => c.target_segment === selectedSegmentId
      );
      if (matchingCand) {
        setSelectedCandidateId(matchingCand.candidate_id);
      }
    } else if (!selectedSegment && availableCandidates.length > 0) {
      // Initialize with first available real candidate
      const first = availableCandidates[0];
      setSelectedSegment(first.target_segment);
      setSelectedCandidateId(first.candidate_id);
    }
  }, [selectedSegmentId, availableCandidates, selectedSegment]);

  // Auto-populate baseline telemetry from live traffic if available
  useEffect(() => {
    if (selectedSegment) {
      const live = trafficRecords.find((t) => t.segment_id === selectedSegment);
      if (live) {
        setBaselineSpeed(live.current_speed_kmh);
        setBaselineFlow(live.current_flow_vph);
      }
    }
  }, [selectedSegment, trafficRecords]);

  // Run Simulation Handler
  const handleExecuteSimulation = useCallback(async () => {
    if (!selectedSegment || !selectedCandidateId) return;

    setLoading(true);
    setError(null);

    try {
      const payload: SimulationRunRequest = {
        target_segment: selectedSegment,
        candidate_id: selectedCandidateId,
        scenario_id: scenarioId || "USER_SIMULATION",
        baseline_flow_vph: baselineFlow,
        baseline_observed_speed_kmh: baselineSpeed,
        baseline_queue_veh: baselineQueue,
      };

      const res = await runSimulation(payload);
      setResult(res);
    } catch (err: unknown) {
      setResult(null);
      if (err instanceof ApiClientError) {
        if (err.status === 0) {
          setError(
            "Network error: Unable to reach simulation engine on FastAPI port 8000."
          );
        } else if (typeof err.details === "object" && err.details !== null && "detail" in err.details) {
          setError(String((err.details as { detail: unknown }).detail));
        } else {
          setError(`Simulation Engine Error (${err.status}): ${err.statusText}`);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unexpected error occurred while running what-if simulation.");
      }
    } finally {
      setLoading(false);
    }
  }, [
    selectedSegment,
    selectedCandidateId,
    scenarioId,
    baselineFlow,
    baselineSpeed,
    baselineQueue,
  ]);

  // Associated limitation text from recommendation if present
  const matchingLimitation = useMemo(() => {
    const match = availableCandidates.find(
      (c) => c.candidate_id === selectedCandidateId
    );
    return match?.engineering_limitations;
  }, [availableCandidates, selectedCandidateId]);

  return (
    <Panel
      id="simulation"
      title="06 WHAT HAPPENS IF WE DO IT?"
      subtitle="WHAT-IF SIMULATION &middot; Model potential network response before taking action using BPR &amp; queue dynamics"
      className="w-full"
      contentClassName="p-5 sm:p-6 space-y-6"
      actions={
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium text-purple-400 bg-purple-950/60 border border-purple-800/40 flex items-center gap-1">
            <FlaskConical className="w-3 h-3 text-purple-400" />
            STEP 8 LAB
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 hidden sm:inline-flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            LOCKED PIPELINE
          </span>
        </div>
      }
    >
      {/* 1. TOP LAB DESCRIPTOR & ADVISORY NOTICE */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3.5 rounded-xl bg-purple-950/20 border border-purple-900/30 text-xs font-mono text-slate-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-900/40 border border-purple-700/50 flex items-center justify-center text-purple-300 shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-100 flex items-center gap-2">
              <span>Decision Support Counterfactual Engine</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60">
                POST /api/simulation/run
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Answers &ldquo;What happens if we apply this available intervention?&rdquo; using BPR travel times, fluid discharge queues, and spillback network footprints.
            </p>
          </div>
        </div>

        <div className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-lg shrink-0">
          SIMULATED / ADVISORY &bull; NOT LIVE CONTROL
        </div>
      </div>

      {/* 2. SIMULATION CONTROLS */}
      <SimulationControls
        candidates={availableCandidates}
        selectedSegment={selectedSegment}
        onSelectSegment={(seg) => {
          setSelectedSegment(seg);
          onSelectSegment?.(seg);
        }}
        selectedCandidateId={selectedCandidateId}
        onSelectCandidateId={setSelectedCandidateId}
        scenarioId={scenarioId}
        onScenarioChange={setScenarioId}
        baselineFlow={baselineFlow}
        onBaselineFlowChange={setBaselineFlow}
        baselineSpeed={baselineSpeed}
        onBaselineSpeedChange={setBaselineSpeed}
        baselineQueue={baselineQueue}
        onBaselineQueueChange={setBaselineQueue}
        loading={loading}
        onRunSimulation={handleExecuteSimulation}
        availableSegments={allAvailableSegments}
      />

      {/* 3. RUNNING STATE (SKELETON / SPINNER) */}
      {loading && (
        <div className="p-8 rounded-xl bg-slate-950/80 border border-purple-900/50 flex flex-col items-center justify-center gap-3 text-center animate-pulse">
          <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
          <div className="space-y-1">
            <div className="text-sm font-mono font-bold text-purple-300">
              RUNNING WHAT-IF SIMULATION...
            </div>
            <p className="text-xs font-mono text-slate-400">
              Solving Bureau of Public Roads (BPR) link performance, fluid queue evacuation, and spillback propagation cascade.
            </p>
          </div>
        </div>
      )}

      {/* 4. ERROR STATE */}
      {!loading && error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono shadow-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <div className="font-bold text-rose-200 uppercase">
                SIMULATION UNAVAILABLE
              </div>
              <p className="text-[11px] text-rose-300/80 mt-0.5">{error}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExecuteSimulation}
            className="px-3 py-1.5 rounded-lg text-xs font-mono text-rose-200 bg-rose-900/60 hover:bg-rose-800/70 border border-rose-700 transition-colors shrink-0 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Simulation</span>
          </button>
        </div>
      )}

      {/* 5. SUCCESSFUL SIMULATION RESULT */}
      {!loading && result && (
        <SimulationComparison
          result={result}
          engineeringLimitations={matchingLimitation}
        />
      )}

      {/* 6. INITIAL / EMPTY STATE */}
      {!loading && !error && !result && (
        <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800/60 flex flex-col items-center justify-center text-center gap-2 text-xs font-mono text-slate-400">
          <FlaskConical className="w-7 h-7 text-slate-600 mb-1" />
          <div className="font-bold text-slate-300">
            Awaiting What-If Simulation Trigger
          </div>
          <p className="text-[11px] text-slate-500 max-w-lg leading-relaxed">
            Select an available target segment and organizer planning candidate above, then click &ldquo;RUN WHAT-IF SIMULATION&rdquo; to model the counterfactual travel times, delay reductions, and queue mitigations.
          </p>
        </div>
      )}
    </Panel>
  );
}
