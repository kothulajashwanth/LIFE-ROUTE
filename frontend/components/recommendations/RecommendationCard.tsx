"use client";

import React from "react";
import {
  AlertTriangle,
  TrendingDown,
  Shield,
  Clock,
  Layers,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { RecommendationRecord } from "@/types/recommendations";

interface RecommendationCardProps {
  recommendation: RecommendationRecord;
  isSelected?: boolean;
  onSelect?: (recommendation: RecommendationRecord) => void;
  onLocateSegment?: (segmentId: string) => void;
}

const URGENCY_CONFIG: Record<
  string,
  { bg: string; text: string; border: string; label: string }
> = {
  CRITICAL: {
    bg: "bg-rose-950/70",
    text: "text-rose-400",
    border: "border-rose-500/50",
    label: "CRITICAL",
  },
  HIGH: {
    bg: "bg-orange-950/70",
    text: "text-orange-400",
    border: "border-orange-500/50",
    label: "HIGH",
  },
  MEDIUM: {
    bg: "bg-amber-950/70",
    text: "text-amber-400",
    border: "border-amber-500/50",
    label: "MEDIUM",
  },
  ADVISORY: {
    bg: "bg-cyan-950/70",
    text: "text-cyan-400",
    border: "border-cyan-500/50",
    label: "ADVISORY",
  },
};

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  TACTICAL_OPERATIONAL: {
    label: "TACTICAL",
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-950/40",
  },
  STRATEGIC_CAPITAL: {
    label: "STRATEGIC",
    color: "text-purple-400 border-purple-500/30 bg-purple-950/40",
  },
};

export function RecommendationCard({
  recommendation,
  isSelected = false,
  onSelect,
  onLocateSegment,
}: RecommendationCardProps) {
  const urgencyStyle =
    URGENCY_CONFIG[recommendation.urgency_level] || URGENCY_CONFIG.ADVISORY;
  const tierStyle =
    TIER_CONFIG[recommendation.recommendation_tier] || {
      label: recommendation.recommendation_tier,
      color: "text-slate-400 border-slate-700 bg-slate-900",
    };

  const isNoCandidate =
    recommendation.action_type === "NO_CANDIDATE_AVAILABLE" ||
    recommendation.candidate_id === "NO_CANDIDATE_AVAILABLE";

  const actionTitle = recommendation.action_type.replace(/_/g, " ");

  return (
    <div
      onClick={() => onSelect?.(recommendation)}
      className={`p-4 rounded-xl border transition-all cursor-pointer font-mono text-xs space-y-3 ${
        isSelected
          ? "bg-slate-900 border-cyan-500 shadow-[0_0_16px_rgba(6,182,212,0.18)]"
          : "bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50"
      }`}
    >
      {/* 1. Header: Urgency & Tier Badges + Target Segment */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Urgency Badge */}
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded border ${urgencyStyle.bg} ${urgencyStyle.text} ${urgencyStyle.border}`}
          >
            {urgencyStyle.label}
          </span>

          {/* Tier Badge */}
          <span
            className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${tierStyle.color}`}
          >
            {tierStyle.label}
          </span>
        </div>

        {/* Target Segment */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLocateSegment?.(recommendation.target_segment);
          }}
          className="text-slate-200 font-bold hover:text-cyan-400 transition-colors flex items-center gap-1 group"
          title="Locate segment on network map"
        >
          <span>{recommendation.target_segment}</span>
          <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-cyan-400" />
        </button>
      </div>

      {/* 2. Action Type & Candidate */}
      <div>
        {isNoCandidate ? (
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>NO SIMULATED INTERVENTION AVAILABLE</span>
          </div>
        ) : (
          <div className="text-sm font-bold text-slate-100 uppercase tracking-wide">
            {actionTitle}
          </div>
        )}
        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-3">
          <span>Candidate: <strong className="text-slate-400">{recommendation.candidate_id}</strong></span>
          <span>Feasibility: <strong className="text-slate-400 uppercase">{recommendation.feasibility_band}</strong></span>
          <span>Cost: <strong className="text-slate-400">{recommendation.cost_index}/5</strong></span>
        </div>
      </div>

      {/* 3. Expected Impact Metrics */}
      <div className="grid grid-cols-3 gap-2 bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-lg text-center">
        {/* Delay Reduction */}
        <div>
          <span className="text-[9px] text-slate-500 block uppercase">DELAY RELIEF</span>
          <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-0.5 mt-0.5">
            <TrendingDown className="w-3 h-3" />
            {recommendation.expected_delay_reduction_pct.toFixed(1)}%
          </span>
        </div>

        {/* Queue Reduction */}
        <div>
          <span className="text-[9px] text-slate-500 block uppercase">QUEUE RELIEF</span>
          <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-0.5 mt-0.5">
            <TrendingDown className="w-3 h-3" />
            {recommendation.expected_queue_reduction_veh.toFixed(0)} veh
          </span>
        </div>

        {/* Upstream Segments Protected */}
        <div>
          <span className="text-[9px] text-slate-500 block uppercase">UPSTREAM PROT.</span>
          <span className="text-xs font-bold text-cyan-400 flex items-center justify-center gap-0.5 mt-0.5">
            <Shield className="w-3 h-3" />
            {recommendation.upstream_segments_protected} seg
          </span>
        </div>
      </div>

      {/* 4. MCDA Score Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>MCDA PRIORITY SCORE</span>
          <span className="font-bold text-slate-200">
            {recommendation.mcda_score.toFixed(2)}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, recommendation.mcda_score * 100))}%` }}
          />
        </div>
      </div>

      {/* 5. Footer Timestamp */}
      <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-900">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {recommendation.timestamp.split(" ")[1] || recommendation.timestamp}
        </span>
        <span className="text-slate-400 flex items-center gap-0.5">
          Inspect Evidence
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}
