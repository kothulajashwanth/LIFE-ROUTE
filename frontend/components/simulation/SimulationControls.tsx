"use client";

import React, { useMemo } from "react";
import {
  Sliders,
  Play,
  RefreshCw,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldAlert,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { AvailableCandidate } from "@/types/simulation";
import { clsx } from "clsx";

interface SimulationControlsProps {
  candidates: AvailableCandidate[];
  selectedSegment: string;
  onSelectSegment: (segment: string) => void;
  selectedCandidateId: string;
  onSelectCandidateId: (candidateId: string) => void;
  scenarioId: string;
  onScenarioChange: (scenario: string) => void;
  baselineFlow?: number;
  onBaselineFlowChange: (flow?: number) => void;
  baselineSpeed?: number;
  onBaselineSpeedChange: (speed?: number) => void;
  baselineQueue?: number;
  onBaselineQueueChange: (queue?: number) => void;
  loading: boolean;
  onRunSimulation: () => void;
  availableSegments: string[];
}

const FEASIBILITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low: {
    bg: "bg-emerald-950/50",
    text: "text-emerald-400",
    border: "border-emerald-700/50",
  },
  medium: {
    bg: "bg-amber-950/50",
    text: "text-amber-400",
    border: "border-amber-700/50",
  },
  high: {
    bg: "bg-rose-950/50",
    text: "text-rose-400",
    border: "border-rose-700/50",
  },
};

const STANDARD_SCENARIOS = [
  { id: "USER_SIMULATION", label: "User What-If Run (Standard)" },
  { id: "PEAK_CONGESTION_COUNTERFACTUAL", label: "Peak Congestion Stress Run" },
  { id: "INCIDENT_SPILLOVER_COUNTERFACTUAL", label: "Incident Spillback Mitigation" },
];

export function SimulationControls({
  candidates,
  selectedSegment,
  onSelectSegment,
  selectedCandidateId,
  onSelectCandidateId,
  scenarioId,
  onScenarioChange,
  baselineFlow,
  onBaselineFlowChange,
  baselineSpeed,
  onBaselineSpeedChange,
  baselineQueue,
  onBaselineQueueChange,
  loading,
  onRunSimulation,
  availableSegments,
}: SimulationControlsProps) {
  // Filter candidates for selected segment
  const segmentCandidates = useMemo(() => {
    return candidates.filter(
      (c) => c.target_segment === selectedSegment && c.candidate_id !== "NONE"
    );
  }, [candidates, selectedSegment]);

  // Distinct segments that have actual planning candidates
  const segmentsWithCandidates = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => {
      if (c.candidate_id !== "NONE") {
        set.add(c.target_segment);
      }
    });
    return Array.from(set);
  }, [candidates]);

  const canRun = Boolean(
    selectedSegment &&
      selectedCandidateId &&
      selectedCandidateId !== "NONE" &&
      !loading
  );

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* SECTION 1: TARGET SEGMENT & SCENARIO CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* TARGET SEGMENT SELECTOR */}
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="sim-target-segment"
              className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Target Corridor / Segment</span>
            </label>
            <span className="text-[9px] text-cyan-400/80">
              {segmentsWithCandidates.length} Available with Plans
            </span>
          </div>

          <select
            id="sim-target-segment"
            value={selectedSegment}
            onChange={(e) => {
              const seg = e.target.value;
              onSelectSegment(seg);
              // Auto-select first matching candidate if available
              const firstCand = candidates.find(
                (c) => c.target_segment === seg && c.candidate_id !== "NONE"
              );
              if (firstCand) {
                onSelectCandidateId(firstCand.candidate_id);
              } else {
                onSelectCandidateId("");
              }
            }}
            disabled={loading}
            className="w-full px-2.5 py-1.5 rounded-lg bg-surface/90 border border-surface-border text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
          >
            <option value="">-- Select Target Segment --</option>
            {/* Group 1: Segments with actual planning candidates */}
            <optgroup label="Segments with Available Planning Candidates">
              {segmentsWithCandidates.map((seg) => (
                <option key={seg} value={seg}>
                  {seg} &bull; Validated Intervention Candidate
                </option>
              ))}
            </optgroup>
            {/* Group 2: Other network segments from observed data */}
            {availableSegments.filter((s) => !segmentsWithCandidates.includes(s)).length > 0 && (
              <optgroup label="Other Observed Corridors (No Candidate)">
                {availableSegments
                  .filter((s) => !segmentsWithCandidates.includes(s))
                  .slice(0, 30)
                  .map((seg) => (
                    <option key={seg} value={seg}>
                      {seg} [NO_CANDIDATE_AVAILABLE]
                    </option>
                  ))}
              </optgroup>
            )}
          </select>

          {/* Quick Segment Shortcut Chips */}
          <div className="flex flex-wrap gap-1 pt-1">
            <span className="text-[9px] text-slate-500 self-center mr-1">Quick Select:</span>
            {segmentsWithCandidates.slice(0, 6).map((seg) => (
              <button
                key={seg}
                type="button"
                onClick={() => {
                  onSelectSegment(seg);
                  const firstCand = candidates.find(
                    (c) => c.target_segment === seg && c.candidate_id !== "NONE"
                  );
                  if (firstCand) {
                    onSelectCandidateId(firstCand.candidate_id);
                  }
                }}
                className={clsx(
                  "px-1.5 py-0.5 rounded text-[10px] border transition-colors",
                  selectedSegment === seg
                    ? "bg-cyan-950 text-cyan-300 border-cyan-500/60"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700"
                )}
              >
                {seg}
              </button>
            ))}
          </div>
        </div>

        {/* SCENARIO CONFIGURATION */}
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="sim-scenario-id"
              className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Simulation Scenario Context</span>
            </label>
            <span className="text-[9px] text-slate-500 font-mono">
              Step 8 BPR Formulation
            </span>
          </div>

          <select
            id="sim-scenario-id"
            value={scenarioId}
            onChange={(e) => onScenarioChange(e.target.value)}
            disabled={loading}
            className="w-full px-2.5 py-1.5 rounded-lg bg-surface/90 border border-surface-border text-slate-200 text-xs font-mono focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
          >
            {STANDARD_SCENARIOS.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.label} ({sc.id})
              </option>
            ))}
          </select>

          <p className="text-[10px] text-slate-500 leading-tight pt-1">
            Standard BPR alpha=0.15, beta=4.0 with 15-minute queue dynamics under
            static observed demand.
          </p>
        </div>
      </div>

      {/* SECTION 2: AVAILABLE INTERVENTION CANDIDATES */}
      <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] uppercase font-bold text-slate-300">
              Organizer Planning Intervention Candidates
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            {segmentCandidates.length} candidate(s) for {selectedSegment || "selected corridor"}
          </span>
        </div>

        {segmentCandidates.length === 0 ? (
          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-300 flex items-start gap-2.5 text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-amber-200">
                {selectedSegment
                  ? `No planning candidate registered for segment ${selectedSegment}`
                  : "Please select a target corridor above to inspect available interventions"}
              </div>
              <p className="text-[10px] text-amber-400/80 leading-relaxed">
                In strict compliance with verified Step 8 standards, only actual organizer planning
                candidates are evaluated. Zero synthetic interventions are fabricated. Choose one of
                the quick-select corridors above ({segmentsWithCandidates.slice(0, 4).join(", ")}) to
                simulate real candidates.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {segmentCandidates.map((cand) => {
              const isSelected = cand.candidate_id === selectedCandidateId;
              const feasColor =
                FEASIBILITY_COLORS[cand.feasibility_band.toLowerCase()] ||
                FEASIBILITY_COLORS.low;

              return (
                <div
                  key={cand.candidate_id}
                  onClick={() => !loading && onSelectCandidateId(cand.candidate_id)}
                  className={clsx(
                    "p-3 rounded-lg border cursor-pointer transition-all relative select-none",
                    isSelected
                      ? "bg-cyan-950/50 border-cyan-500/70 shadow-[0_0_12px_rgba(6,182,212,0.15)] ring-1 ring-cyan-400"
                      : "bg-surface/50 border-surface-border/80 hover:border-slate-700 hover:bg-surface/80",
                    loading && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      {isSelected ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-600 block" />
                      )}
                      {cand.candidate_id}
                    </span>
                    <span
                      className={clsx(
                        "text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold",
                        feasColor.bg,
                        feasColor.text,
                        feasColor.border
                      )}
                    >
                      {cand.feasibility_band}
                    </span>
                  </div>

                  <div className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wide">
                    {cand.intervention_type.replace(/_/g, " ")}
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                    <div>
                      <span className="text-slate-500 block text-[9px]">CAPACITY DELTA</span>
                      <span className="text-emerald-400 font-semibold">
                        +{cand.capacity_delta_vph || 450} vph
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">COST INDEX</span>
                      <span className="text-slate-200 font-semibold">
                        {cand.cost_index}/20
                      </span>
                    </div>
                  </div>

                  {cand.expected_delay_reduction_pct !== undefined && (
                    <div className="mt-1.5 text-[9px] text-slate-400 flex items-center justify-between bg-slate-950/40 px-1.5 py-0.5 rounded">
                      <span>Expected Delay &darr;</span>
                      <span className="text-emerald-400 font-bold">
                        {cand.expected_delay_reduction_pct.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: OPTIONAL BASELINE PARAMETER OVERRIDES */}
      <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="uppercase font-bold text-slate-400">
            Baseline Physical Parameters (Observed Telemetry)
          </span>
          <span className="text-slate-500 text-[9px]">
            Auto-derived from network topology if left blank
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-1">
              Observed Flow (vph)
            </label>
            <input
              type="number"
              placeholder="e.g. 1650"
              value={baselineFlow ?? ""}
              onChange={(e) =>
                onBaselineFlowChange(
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              disabled={loading}
              className="w-full px-2.5 py-1 rounded bg-surface/80 border border-surface-border text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-1">
              Observed Speed (km/h)
            </label>
            <input
              type="number"
              placeholder="e.g. 24.0"
              value={baselineSpeed ?? ""}
              onChange={(e) =>
                onBaselineSpeedChange(
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              disabled={loading}
              className="w-full px-2.5 py-1 rounded bg-surface/80 border border-surface-border text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-[9px] text-slate-500 uppercase block mb-1">
              Current Queue (veh)
            </label>
            <input
              type="number"
              placeholder="e.g. 25.0"
              value={baselineQueue ?? ""}
              onChange={(e) =>
                onBaselineQueueChange(
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              disabled={loading}
              className="w-full px-2.5 py-1 rounded bg-surface/80 border border-surface-border text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: RUN BUTTON */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span>
            Advisory evaluation only. Zero live municipal controller overrides are executed.
          </span>
        </div>

        <button
          type="button"
          onClick={onRunSimulation}
          disabled={!canRun}
          className={clsx(
            "w-full sm:w-auto px-6 py-2.5 min-h-[44px] rounded-lg text-xs font-sans font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg",
            canRun
              ? "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/30 cursor-pointer active:scale-[0.98]"
              : "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed opacity-70"
          )}
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>SIMULATING...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RUN WHAT-IF SIMULATION</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
