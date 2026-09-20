"use client";

import React, { useMemo } from "react";
import {
  Activity,
  Cpu,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowDown,
  Info,
  ShieldAlert,
} from "lucide-react";
import { RecommendationRecord } from "@/types/recommendations";
import { ProvenanceBadge } from "../ui/ProvenanceBadge";

interface EvidenceChainProps {
  recommendation: RecommendationRecord;
}

export function EvidenceChain({ recommendation }: EvidenceChainProps) {
  // Parse structured provenance blocks from operational_rationale
  const parsedBlocks = useMemo(() => {
    const raw = recommendation.operational_rationale || "";
    
    // Attempt parsing [OBSERVED], [DERIVED], [SIMULATED]
    let observedText = "";
    let derivedText = "";
    let simulatedText = "";

    const observedMatch = raw.match(/\[OBSERVED\]\s*([^[]+)/i);
    const derivedMatch = raw.match(/\[DERIVED\]\s*([^[]+)/i);
    const simulatedMatch = raw.match(/\[SIMULATED\]\s*([^[]+)/i);

    if (observedMatch) observedText = observedMatch[1].trim();
    if (derivedMatch) derivedText = derivedMatch[1].trim();
    if (simulatedMatch) simulatedText = simulatedMatch[1].trim();

    // Fallback if formatting varies
    if (!observedText && !derivedText && !simulatedText) {
      derivedText = raw;
    }

    return { observedText, derivedText, simulatedText };
  }, [recommendation.operational_rationale]);

  const isNoCandidate =
    recommendation.action_type === "NO_CANDIDATE_AVAILABLE" ||
    recommendation.candidate_id === "NO_CANDIDATE_AVAILABLE";

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Primary Trigger Evidence Box */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            PRIMARY TRIGGER EVIDENCE
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Target: <strong className="text-slate-300">{recommendation.target_segment}</strong>
          </span>
        </div>
        <p className="text-[11px] text-slate-200 leading-relaxed bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 break-words">
          {recommendation.primary_trigger_evidence}
        </p>
      </div>

      {/* Visual 4-Stage Evidence Chain */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
          OPERATIONAL EVIDENCE CHAIN
        </div>

        {/* STAGE 1: OBSERVED */}
        <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-1.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              STAGE 1 &middot; OBSERVED SENSOR TELEMETRY
            </span>
            <ProvenanceBadge type="OBSERVED" size="sm" />
          </div>
          <p className="text-[11px] text-slate-300 leading-normal pl-5 border-l-2 border-emerald-500/40 py-0.5">
            {parsedBlocks.observedText || "Direct sensor speed, flow, and vehicle queue observations."}
          </p>
        </div>

        {/* Connecting Arrow */}
        <div className="flex justify-center -my-1">
          <ArrowDown className="w-4 h-4 text-cyan-500/70 animate-bounce" />
        </div>

        {/* STAGE 2: DERIVED */}
        <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-1.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cyan-400 flex items-center gap-1.5 text-xs">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              STAGE 2 &middot; DERIVED INTELLIGENCE
            </span>
            <ProvenanceBadge type="DERIVED" size="sm" />
          </div>
          <p className="text-[11px] text-slate-300 leading-normal pl-5 border-l-2 border-cyan-500/40 py-0.5">
            {parsedBlocks.derivedText || "Multi-horizon forward forecasting, incident state classification, and propagation risk."}
          </p>
        </div>

        {/* Connecting Arrow */}
        <div className="flex justify-center -my-1">
          <ArrowDown className="w-4 h-4 text-purple-500/70" />
        </div>

        {/* STAGE 3: SIMULATED */}
        <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-1.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-400 flex items-center gap-1.5 text-xs">
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              STAGE 3 &middot; SIMULATED COUNTERFACTUAL
            </span>
            <ProvenanceBadge type="SIMULATED" size="sm" />
          </div>
          {isNoCandidate ? (
            <div className="pl-5 border-l-2 border-amber-500/60 py-1 space-y-1">
              <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                NO SIMULATED INTERVENTION AVAILABLE
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                {parsedBlocks.simulatedText || "No candidate infrastructure intervention available in catalog for this corridor. Tactical diversion recommended."}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-slate-300 leading-normal pl-5 border-l-2 border-purple-500/40 py-0.5">
              {parsedBlocks.simulatedText || "Counterfactual queue evacuation and dynamic signal phase delta evaluated."}
            </p>
          )}
        </div>

        {/* Connecting Arrow */}
        <div className="flex justify-center -my-1">
          <ArrowDown className="w-4 h-4 text-emerald-500/70" />
        </div>

        {/* STAGE 4: RECOMMENDATION */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              STAGE 4 &middot; MCDA PRIORITIZED RECOMMENDATION
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50 font-mono">
              MCDA: {typeof recommendation.mcda_score === "number" ? recommendation.mcda_score.toFixed(2) : "—"}
            </span>
          </div>

          <div className="pl-5 border-l-2 border-cyan-500 py-0.5 space-y-1 text-xs">
            <div className="font-bold text-slate-200">
              {recommendation.action_type.replace(/_/g, " ")}
            </div>
            <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3">
              <span>Candidate: <strong className="text-slate-200 font-mono">{recommendation.candidate_id}</strong></span>
              <span>Feasibility: <strong className="text-slate-200 uppercase">{recommendation.feasibility_band}</strong></span>
              <span>Cost Index: <strong className="text-slate-200 font-mono">{recommendation.cost_index}/5</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Engineering Limitations (Prominently displayed, not hidden) */}
      <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-1.5">
        <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[10px] uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>ENGINEERING LIMITATIONS &amp; OPERATIONAL UNCERTAINTY</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
          {recommendation.engineering_limitations}
        </p>
      </div>
    </div>
  );
}
