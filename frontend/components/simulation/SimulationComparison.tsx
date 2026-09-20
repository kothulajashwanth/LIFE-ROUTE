"use client";

import React from "react";
import {
  TrendingDown,
  TrendingUp,
  Clock,
  Car,
  Activity,
  GitBranch,
  ShieldCheck,
  AlertOctagon,
  ArrowRight,
  Info,
  FileText,
} from "lucide-react";
import { SimulationRunResponse } from "@/types/simulation";
import { ProvenanceBadge } from "../ui/ProvenanceBadge";
import { clsx } from "clsx";

interface SimulationComparisonProps {
  result: SimulationRunResponse;
  engineeringLimitations?: string;
}

export function SimulationComparison({
  result,
  engineeringLimitations,
}: SimulationComparisonProps) {
  const queueReduction = Math.max(
    0,
    result.baseline_queue_veh - result.counterfactual_queue_veh
  );

  const limitationsText =
    engineeringLimitations ||
    "Advisory/Simulated Only: No actual municipal signal override, physical construction, or dispatch executed. Theoretical travel times derived from standard BPR formula (alpha=0.15, beta=4.0). Queue evacuation assumes fluid discharge over explicit 15m horizon under static demand. Storage capacity assumes 130 veh/km/lane jam density. Organizer recommendation-outcome ground truth does not exist; metrics reflect decision-support analysis.";

  return (
    <div className="space-y-5 font-sans text-xs animate-in fade-in duration-300">
      {/* ================================================== */}
      {/* 1. RESULT HEADER                                   */}
      {/* ================================================== */}
      <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
              WHAT-IF SIMULATION RESULT
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900/60 text-purple-300 border border-purple-700/60">
              SIMULATED / ADVISORY — NOT LIVE CONTROL
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 pt-0.5 font-mono">
            <div>
              <span className="text-slate-500 text-[11px] font-sans">Target: </span>
              <span className="font-bold text-cyan-300">{result.target_segment}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] font-sans">Intervention: </span>
              <span className="font-semibold text-slate-100 uppercase font-sans">
                {result.intervention_type.replace(/_/g, " ")}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] font-sans">Candidate: </span>
              <span className="font-bold text-slate-200">{result.candidate_id}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] font-sans">Scenario: </span>
              <span className="font-mono text-slate-300">{result.scenario_id}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <ProvenanceBadge type="SIMULATED" size="md" />
        </div>
      </div>

      {/* ================================================== */}
      {/* 2. MODELED EXPECTED IMPACT SUMMARY                 */}
      {/* ================================================== */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            EXPECTED MODELED IMPACT (COUNTERFACTUAL VS BASELINE)
          </span>
          <span className="text-[9px] text-slate-500">
            Modeled counterfactual results &bull; Non-guaranteed theoretical estimates
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* IMPACT 1: DELAY REDUCTION % */}
          <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-left font-mono">
            <span className="text-[9px] uppercase text-emerald-400/70 block font-sans">
              BPR Delay Delta
            </span>
            <div className="text-lg font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
              <TrendingDown className="w-4 h-4" />
              <span>{typeof result.delay_reduction_pct === "number" ? `${result.delay_reduction_pct.toFixed(1)}%` : "—"}</span>
            </div>
            <span className="text-[10px] text-emerald-500/80 block mt-0.5">
              -{typeof result.delay_reduction_s === "number" ? result.delay_reduction_s.toFixed(2) : "—"}s per vehicle
            </span>
          </div>

          {/* IMPACT 2: QUEUE REDUCTION */}
          <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-left font-mono">
            <span className="text-[9px] uppercase text-cyan-400/70 block font-sans">
              Simulated Queue Delta
            </span>
            <div className="text-lg font-bold text-cyan-400 flex items-center gap-1 mt-0.5">
              <TrendingDown className="w-4 h-4" />
              <span>{typeof queueReduction === "number" ? `${queueReduction.toFixed(1)} veh` : "—"}</span>
            </div>
            <span className="text-[10px] text-cyan-500/80 block mt-0.5">
              {typeof result.baseline_queue_veh === "number" ? result.baseline_queue_veh.toFixed(1) : "—"} &rarr; {typeof result.counterfactual_queue_veh === "number" ? result.counterfactual_queue_veh.toFixed(1) : "—"} veh
            </span>
          </div>

          {/* IMPACT 3: UPSTREAM SEGMENTS RELIEVED */}
          <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-800/40 text-left font-mono">
            <span className="text-[9px] uppercase text-purple-400/70 block font-sans">
              Segments Relieved
            </span>
            <div className="text-lg font-bold text-purple-400 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
              <span>{result.segments_relieved ?? "—"}</span>
            </div>
            <span className="text-[10px] text-purple-400/80 block mt-0.5 font-sans">
              Cascade spillover reduced
            </span>
          </div>

          {/* IMPACT 4: SPEED GAIN */}
          <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/40 text-left font-mono">
            <span className="text-[9px] uppercase text-blue-400/70 block font-sans">
              Speed Delta
            </span>
            <div className="text-lg font-bold text-blue-400 flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-4 h-4" />
              <span>+{typeof result.speed_delta_kmh === "number" ? result.speed_delta_kmh.toFixed(2) : "—"} km/h</span>
            </div>
            <span className="text-[10px] text-blue-500/80 block mt-0.5">
              {typeof result.baseline_speed_kmh === "number" ? result.baseline_speed_kmh.toFixed(1) : "—"} &rarr; {typeof result.simulated_speed_kmh === "number" ? result.simulated_speed_kmh.toFixed(1) : "—"} km/h
            </span>
            <div className="flex items-center justify-between text-[10px] text-blue-400/80 mt-1 border-t border-blue-800/40 pt-1 font-mono">
              <span className="font-sans">Capacity Delta:</span>
              <span className="font-bold">+{result.capacity_delta_vph} vph</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 3. SIDE-BY-SIDE: BASELINE VS COUNTERFACTUAL        */}
      {/* ================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT: BASELINE OBSERVED & THEORETICAL */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                BASELINE (OBSERVED STATE)
              </h4>
            </div>
            <ProvenanceBadge type="OBSERVED" size="sm" />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Theoretical Travel Time
              </span>
              <span className="font-bold text-slate-200">
                {result.baseline_theoretical_travel_time_min.toFixed(2)} min
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-500" />
                BPR Delay
              </span>
              <span className="font-bold text-amber-400">
                {result.baseline_delay_s.toFixed(2)} sec
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-slate-500" />
                Observed / Input Queue
              </span>
              <span className="font-bold text-rose-400">
                {result.baseline_queue_veh.toFixed(1)} vehicles
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-slate-500" />
                Spillback Risk Index
              </span>
              <span
                className={clsx(
                  "font-bold font-mono",
                  result.baseline_spillback_risk > 0.02
                    ? "text-rose-400"
                    : "text-amber-400"
                )}
              >
                {result.baseline_spillback_risk.toFixed(3)} (
                {result.baseline_spillback_risk > 0.02 ? "HIGH" : "MODERATE"})
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                Baseline Speed
              </span>
              <span className="font-bold text-slate-200">
                {result.baseline_observed_speed_kmh.toFixed(1)} km/h
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                Impacted Segments
              </span>
              <span className="font-bold text-slate-300">
                {result.baseline_impacted_segments} segments
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/60">
              <span className="text-slate-400">Baseline Demand Flow</span>
              <span className="font-mono text-slate-300">
                {result.baseline_flow_vph.toFixed(0)} vph
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: COUNTERFACTUAL SIMULATED */}
        <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/50 space-y-3">
          <div className="flex items-center justify-between border-b border-purple-800/40 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-200">
                COUNTERFACTUAL (SIMULATED STATE)
              </h4>
            </div>
            <ProvenanceBadge type="SIMULATED" size="sm" />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-purple-900/40">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Theoretical Travel Time
              </span>
              <span className="font-bold text-cyan-300">
                {result.counterfactual_theoretical_travel_time_min.toFixed(2)} min
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-purple-900/40">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Counterfactual Delay
              </span>
              <span className="font-bold text-emerald-400">
                {result.counterfactual_delay_s.toFixed(2)} sec (
                &darr;{result.delay_reduction_pct.toFixed(1)}%)
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-purple-900/40">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-cyan-400" />
                Simulated 15m Queue
              </span>
              <span className="font-bold text-cyan-400">
                {result.counterfactual_queue_veh.toFixed(1)} vehicles (
                &darr;{queueReduction.toFixed(1)})
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-purple-900/40">
              <span className="text-slate-300 flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-cyan-400" />
                Spillback Risk Index
              </span>
              <span className="font-bold text-emerald-400 font-mono">
                {result.counterfactual_spillback_risk.toFixed(3)} (
                {result.counterfactual_spillback_risk < 0.01 ? "MINIMAL" : "LOW"})
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-purple-900/40">
              <span className="text-slate-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                Counterfactual Speed
              </span>
              <span className="font-bold text-cyan-300">
                {result.counterfactual_speed_kmh.toFixed(1)} km/h (
                +{result.speed_delta_kmh.toFixed(2)})
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-purple-900/40">
              <span className="text-slate-300 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                Remaining Impacted Segments
              </span>
              <span className="font-bold text-slate-200">
                {result.counterfactual_impacted_segments} segments (
                {result.segments_relieved} relieved)
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-purple-900/40">
              <span className="text-slate-300">Capacity Enhancement</span>
              <span className="font-mono text-emerald-400 font-bold">
                +{result.capacity_delta_vph} vph
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 4. EXPLAINABILITY & EVIDENCE                       */}
      {/* ================================================== */}
      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Explainable Evidence &amp; Model Formulation</span>
          </span>
          <div className="flex items-center gap-1.5">
            <ProvenanceBadge type="OBSERVED" size="sm" />
            <ArrowRight className="w-2.5 h-2.5 text-slate-600" />
            <ProvenanceBadge type="DERIVED" size="sm" />
            <ArrowRight className="w-2.5 h-2.5 text-slate-600" />
            <ProvenanceBadge type="SIMULATED" size="sm" />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 text-[11px] text-slate-300 leading-relaxed font-mono">
          {result.evidence_reason}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[10px] text-slate-400">
          <div className="p-2 rounded bg-slate-900/30 border border-slate-800/60">
            <span className="text-cyan-400 font-semibold block">[OBSERVED]</span>
            <span>Sensor telemetry &amp; baseline traffic flow measurements</span>
          </div>
          <div className="p-2 rounded bg-slate-900/30 border border-slate-800/60">
            <span className="text-amber-400 font-semibold block">[DERIVED]</span>
            <span>Network topology, congestion scores, and propagation spillback</span>
          </div>
          <div className="p-2 rounded bg-slate-900/30 border border-slate-800/60">
            <span className="text-purple-400 font-semibold block">[SIMULATED]</span>
            <span>Theoretical BPR counterfactual delays &amp; queue mitigation</span>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 5. ENGINEERING LIMITATIONS                         */}
      {/* ================================================== */}
      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-amber-900/30 space-y-2">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
            ENGINEERING LIMITATIONS &amp; METHODOLOGICAL SAFEGUARDS
          </span>
        </div>

        <div className="p-3 rounded-lg bg-amber-950/10 border border-amber-800/30 text-[11px] text-amber-200/90 leading-relaxed font-mono">
          {limitationsText}
        </div>
        <p className="text-[10px] text-slate-500 pt-0.5">
          Step 8 verified engineering disclaimer: The counterfactual is a modeled estimate, not an observed outcome. No real-world controller action was executed.
        </p>
      </div>
    </div>
  );
}
