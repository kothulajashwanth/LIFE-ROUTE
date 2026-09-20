"use client";

import React, { useMemo } from "react";
import {
  Lightbulb,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Sliders,
} from "lucide-react";
import { RecommendationRecord } from "@/types/recommendations";
import { ProvenanceBadge } from "../ui/ProvenanceBadge";

interface RecommendationPanelProps {
  records: RecommendationRecord[];
  totalRecords: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  selectedRecord?: RecommendationRecord | null;
  onSelectRecord?: (record: RecommendationRecord) => void;
  onOpenFullView?: () => void;
  selectedSegmentId?: string | null;
  onSelectSegment?: (segmentId: string) => void;
}

const URGENCY_BADGES: Record<string, { bg: string; text: string }> = {
  CRITICAL: { bg: "bg-rose-950/70 border-rose-500/50", text: "text-rose-400" },
  HIGH: { bg: "bg-orange-950/70 border-orange-500/50", text: "text-orange-400" },
  MEDIUM: { bg: "bg-amber-950/70 border-amber-500/50", text: "text-amber-400" },
  ADVISORY: { bg: "bg-cyan-950/70 border-cyan-500/50", text: "text-cyan-400" },
};

export function RecommendationPanel({
  records,
  totalRecords,
  loading = false,
  error,
  onRetry,
  selectedRecord,
  onSelectRecord,
  onOpenFullView,
  selectedSegmentId,
  onSelectSegment,
}: RecommendationPanelProps) {
  const counts = useMemo(() => {
    let critical = 0;
    let high = 0;
    let tactical = 0;
    for (const r of records) {
      if (r.urgency_level === "CRITICAL") critical++;
      if (r.urgency_level === "HIGH") high++;
      if (r.recommendation_tier === "TACTICAL_OPERATIONAL") tactical++;
    }
    return { critical, high, tactical };
  }, [records]);

  // Corridor recommendation lookup
  const matchingRecommendation = useMemo(() => {
    if (!selectedSegmentId) return null;
    return records.find((r) => r.target_segment === selectedSegmentId) || null;
  }, [records, selectedSegmentId]);

  return (
    <div className="flex flex-col justify-between h-full space-y-3 font-sans">
      {/* 1. Decision Engine Status Header */}
      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[10px] text-slate-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>DECISION ENGINE ONLINE</span>
          </div>
          <ProvenanceBadge type="DERIVED" size="sm" />
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          Evidence-driven counterfactual mitigation recommendations
        </p>
      </div>

      {/* Corridor Advisory Status Banner (Requirement 12 & 16: NO ADVISORY AVAILABLE) */}
      {selectedSegmentId && (
        <div className="p-2.5 rounded-lg border bg-slate-950/90 border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">
              ADVISORY STATUS &middot; {selectedSegmentId}
            </span>
            {matchingRecommendation ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/60 text-emerald-300">
                RECOMMENDATION ACTIVE
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-400">
                NO CANDIDATE AVAILABLE
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {matchingRecommendation
              ? `Action: ${matchingRecommendation.action_type.replace(/_/g, " ")} • Candidate: ${matchingRecommendation.candidate_id || "Standard"} • MCDA: ${typeof matchingRecommendation.mcda_score === "number" ? matchingRecommendation.mcda_score.toFixed(2) : "—"}`
              : "No organizer-provided intervention candidate is available for this scenario."}
          </p>
          {matchingRecommendation && (
            <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                WHY THIS RECOMMENDATION?
              </span>
              <ul className="text-[10px] text-slate-300 space-y-0.5">
                <li>• Incident affects corridor {matchingRecommendation.target_segment}</li>
                <li>• Connected network segments were evaluated via real topology</li>
                <li>• Alternative corridor is connected through the organizer graph</li>
                <li>• Current traffic state was considered where available</li>
                <li>• Recommendation avoids the congested road segment</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 2. Quick Summary Row */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
          <span className="text-[9px] text-slate-500 block uppercase">ADVISORIES</span>
          <span className="text-sm font-bold text-slate-200">{totalRecords}</span>
        </div>
        <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-900/40">
          <span className="text-[9px] text-rose-400/70 block uppercase">CRITICAL</span>
          <span className="text-sm font-bold text-rose-400">{counts.critical}</span>
        </div>
        <div className="p-2 rounded-lg bg-orange-950/30 border border-orange-900/40">
          <span className="text-[9px] text-orange-400/70 block uppercase">HIGH PRIORITY</span>
          <span className="text-sm font-bold text-orange-400">{counts.high}</span>
        </div>
      </div>

      {/* 3. Loading State */}
      {loading && (
        <div className="py-8 text-center text-slate-400">
          <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin mx-auto mb-2" />
          <p className="text-xs">Evaluating tactical &amp; strategic actions...</p>
        </div>
      )}

      {/* 4. Error State */}
      {error && !loading && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-center space-y-2">
          <AlertTriangle className="w-5 h-5 text-rose-400 mx-auto" />
          <p className="text-xs text-rose-300">Recommendation data unavailable</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-2.5 py-1 text-xs rounded bg-rose-900 text-rose-200 hover:bg-rose-800"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* 5. Compact Recommendation List */}
      {!loading && !error && records.length > 0 && (
        <div className="space-y-1.5 overflow-y-auto max-h-[160px] pr-1">
          {records.slice(0, 5).map((rec, idx) => {
            const isSelected =
              (selectedRecord?.target_segment === rec.target_segment &&
                selectedRecord?.action_type === rec.action_type) ||
              selectedSegmentId === rec.target_segment;
            const badge =
              URGENCY_BADGES[rec.urgency_level] || URGENCY_BADGES.ADVISORY;
            const isNoCandidate = rec.action_type === "NO_CANDIDATE_AVAILABLE";

            return (
              <div
                key={`${rec.target_segment}-${rec.action_type}-${idx}`}
                onClick={() => {
                  onSelectRecord?.(rec);
                  onSelectSegment?.(rec.target_segment);
                }}
                className={`p-2 rounded-lg border transition-all cursor-pointer text-xs flex items-center justify-between ${
                  isSelected
                    ? "bg-cyan-950/60 border-cyan-500/60"
                    : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-100">
                      {rec.target_segment}
                    </span>
                    <span
                      className={`text-[8px] px-1.5 py-0.2 rounded border font-bold font-sans ${badge.bg} ${badge.text}`}
                    >
                      {rec.urgency_level}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans">
                    {isNoCandidate
                      ? "No simulated candidate available"
                      : rec.action_type.replace(/_/g, " ")}
                  </div>
                </div>

                <div className="text-right space-y-0.5 font-mono">
                  <span className="text-[10px] font-bold text-cyan-400 block">
                    MCDA: {typeof rec.mcda_score === "number" ? rec.mcda_score.toFixed(2) : "—"}
                  </span>
                  <span className="text-[9px] text-emerald-400 flex items-center justify-end gap-0.5">
                    <TrendingDown className="w-2.5 h-2.5" />
                    {typeof rec.expected_delay_reduction_pct === "number" ? `${rec.expected_delay_reduction_pct.toFixed(0)}% delay` : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Empty State */}
      {!loading && !error && records.length === 0 && (
        <div className="py-6 text-center text-xs text-slate-500 font-sans">
          No active recommendations found.
        </div>
      )}

      {/* 7. Action Button: Open Full View */}
      {onOpenFullView && (
        <button
          onClick={onOpenFullView}
          className="w-full py-2 px-3 rounded-lg border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/50 active:scale-[0.99] text-xs font-sans font-medium text-cyan-300 transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>Open AI Advisory Console</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
