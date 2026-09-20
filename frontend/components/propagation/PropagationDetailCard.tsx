"use client";

import React from "react";
import {
  GitBranch,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Info,
  Layers,
  ChevronRight,
  X,
} from "lucide-react";
import { PropagationRecord } from "@/types/propagation";
import { ProvenanceBadge } from "../ui/ProvenanceBadge";

interface PropagationDetailCardProps {
  record: PropagationRecord | null;
  onClose?: () => void;
  onSelectSegment?: (segmentId: string) => void;
}

const RISK_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  HIGH_SPILLBACK_IMPACT: {
    bg: "bg-rose-950/60",
    text: "text-rose-400",
    border: "border-rose-500/40",
    label: "HIGH SPILLBACK",
  },
  MODERATE_PROPAGATION: {
    bg: "bg-amber-950/60",
    text: "text-amber-400",
    border: "border-amber-500/40",
    label: "MODERATE RISK",
  },
  LOW_RISK: {
    bg: "bg-emerald-950/60",
    text: "text-emerald-400",
    border: "border-emerald-500/40",
    label: "LOW RISK",
  },
};

export function PropagationDetailCard({
  record,
  onClose,
  onSelectSegment,
}: PropagationDetailCardProps) {
  if (!record) {
    return (
      <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
        <GitBranch className="w-8 h-8 text-slate-600 mx-auto" />
        <h5 className="text-xs font-mono font-bold text-slate-400 uppercase">
          No Propagation Event Selected
        </h5>
        <p className="text-[11px] text-slate-500 font-mono">
          Select a cascade record to inspect multi-hop spillback footprint.
        </p>
      </div>
    );
  }

  const riskStyle = RISK_CONFIG[record.risk_level] || {
    bg: "bg-slate-900",
    text: "text-slate-300",
    border: "border-slate-700",
    label: record.risk_level,
  };

  // Dynamic explanation generated strictly from API values (Requirement 9)
  const directionText = record.direction.replace(/_/g, " ").toLowerCase();
  const naturalLanguageExplanation = `Congestion originating at ${record.seed_segment_id} is projected to propagate ${directionText} to ${record.propagated_segment_id} within the modeled ${record.horizon_min}-minute horizon.`;

  return (
    <div className="p-5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-4 shadow-xl font-mono text-xs">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
              PROPAGATION INTELLIGENCE
            </span>
            <ProvenanceBadge type="DERIVED" size="sm" />
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Multi-hop queue spillback &amp; cascade analysis
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
            title="Deselect Event"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dynamic Narrative Explanation Banner */}
      <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-cyan-300/90 text-xs leading-relaxed">
        <span className="font-semibold text-cyan-400 block mb-1 uppercase text-[10px] tracking-wider">
          PROJECTED CASCADE SUMMARY
        </span>
        {naturalLanguageExplanation}
      </div>

      {/* Seed -> Propagated Segment Flow */}
      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
        {/* Seed Segment */}
        <div className="space-y-1">
          <span className="text-[9px] text-slate-500 uppercase block font-semibold">
            BOTTLENECK SEED
          </span>
          <button
            onClick={() => onSelectSegment?.(record.seed_segment_id)}
            className="text-sm font-bold text-amber-400 hover:underline flex items-center gap-1"
            title="Inspect seed segment on map"
          >
            <span>{record.seed_segment_id}</span>
            <ChevronRight className="w-3 h-3 text-slate-500" />
          </button>
        </div>

        {/* Direction & Hops Arrow */}
        <div className="flex flex-col items-center px-3">
          <span className="text-[9px] text-slate-500 uppercase">
            {record.hops} {record.hops === 1 ? "HOP" : "HOPS"}
          </span>
          <div className="flex items-center gap-1 my-0.5">
            <span className="w-6 h-0.5 bg-gradient-to-r from-amber-400 to-rose-400" />
            <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <span className="text-[8px] text-cyan-400/80 font-bold uppercase">
            {record.direction.replace(/_/g, " ")}
          </span>
        </div>

        {/* Propagated Segment */}
        <div className="space-y-1 text-right">
          <span className="text-[9px] text-slate-500 uppercase block font-semibold">
            PROPAGATED TARGET
          </span>
          <button
            onClick={() => onSelectSegment?.(record.propagated_segment_id)}
            className="text-sm font-bold text-rose-400 hover:underline flex items-center gap-1 justify-end"
            title="Inspect target segment on map"
          >
            <span>{record.propagated_segment_id}</span>
            <ChevronRight className="w-3 h-3 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Propagation Score */}
        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg space-y-1">
          <div className="text-[10px] text-slate-500 uppercase">PROPAGATION SCORE</div>
          <div className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>{(record.propagation_score * 100).toFixed(1)}%</span>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-rose-400 rounded-full"
                style={{ width: `${Math.min(100, record.propagation_score * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Risk Level */}
        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg space-y-1">
          <div className="text-[10px] text-slate-500 uppercase">RISK LEVEL</div>
          <div className="mt-0.5">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${riskStyle.bg} ${riskStyle.text} ${riskStyle.border}`}
            >
              {riskStyle.label}
            </span>
          </div>
        </div>

        {/* Forecast Horizon */}
        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg">
          <div className="text-[10px] text-slate-500 uppercase">EST. HORIZON</div>
          <div className="text-xs font-bold text-slate-200 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>+{record.horizon_min} Minutes</span>
          </div>
        </div>

        {/* Hop Distance */}
        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg">
          <div className="text-[10px] text-slate-500 uppercase">TOPOLOGY DISTANCE</div>
          <div className="text-xs font-bold text-slate-200 flex items-center gap-1 mt-0.5">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>{record.hops} {record.hops === 1 ? "Segment Hop" : "Segment Hops"}</span>
          </div>
        </div>
      </div>

      {/* Evidence Reason */}
      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1.5">
        <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[10px] uppercase">
          <Info className="w-3 h-3 text-cyan-400" />
          <span>MODEL EVIDENCE &amp; TOPOLOGICAL REASONING</span>
        </div>
        <div className="text-[11px] text-slate-300 font-mono bg-slate-950 p-2 rounded border border-slate-800/60 break-all">
          {record.evidence_reason}
        </div>
      </div>

      {/* Timestamp */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-500" />
          Observation Timestamp
        </span>
        <span className="text-slate-400">{record.timestamp}</span>
      </div>

      {/* Validation Disclosure (Requirement 13 & 14) */}
      <div className="p-2.5 rounded-lg bg-slate-900/30 border border-slate-800/40 text-[9px] text-slate-500 space-y-1 font-sans">
        <p className="font-semibold text-slate-400">
          Validation Disclosure (Step 7 Spillback Engine)
        </p>
        <p className="leading-tight">
          Urban traffic networks lack organizer ground-truth propagation labels; cascade footprints represent derived topological queue spillback estimations. Trajectories are projected/modeled, not confirmed.
        </p>
      </div>
    </div>
  );
}
