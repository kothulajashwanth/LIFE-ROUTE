"use client";

import React, { useMemo } from "react";
import {
  GitBranch,
  AlertTriangle,
  ArrowRight,
  Clock,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { PropagationRecord } from "@/types/propagation";
import { ProvenanceBadge } from "../ui/ProvenanceBadge";

interface PropagationPanelProps {
  records: PropagationRecord[];
  totalRecords: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  selectedRecord?: PropagationRecord | null;
  onSelectRecord?: (record: PropagationRecord) => void;
  onOpenFullView?: () => void;
  selectedSegmentId?: string | null;
  onSelectSegment?: (segmentId: string) => void;
}

const RISK_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  HIGH_SPILLBACK_IMPACT: {
    bg: "bg-rose-950/60 border-rose-500/40",
    text: "text-rose-400",
    label: "HIGH",
  },
  MODERATE_PROPAGATION: {
    bg: "bg-amber-950/60 border-amber-500/40",
    text: "text-amber-400",
    label: "MODERATE",
  },
  LOW_RISK: {
    bg: "bg-emerald-950/60 border-emerald-500/40",
    text: "text-emerald-400",
    label: "LOW",
  },
};

export function PropagationPanel({
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
}: PropagationPanelProps) {
  // Counts by risk band
  const riskCounts = useMemo(() => {
    let high = 0,
      moderate = 0,
      low = 0;
    for (const r of records) {
      if (r.risk_level === "HIGH_SPILLBACK_IMPACT") high++;
      else if (r.risk_level === "MODERATE_PROPAGATION") moderate++;
      else low++;
    }
    return { high, moderate, low };
  }, [records]);

  // Check if selectedSegmentId is involved in cascades
  const matchingCascadeCount = useMemo(() => {
    if (!selectedSegmentId) return 0;
    return records.filter(
      (r) =>
        r.seed_segment_id === selectedSegmentId ||
        r.propagated_segment_id === selectedSegmentId
    ).length;
  }, [records, selectedSegmentId]);

  return (
    <div className="flex flex-col justify-between h-full space-y-3 font-sans">
      {/* 1. Architecture Flow Diagram Banner (Requirement 5) */}
      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[10px] text-slate-400 space-y-1">
        <div className="text-[9px] font-bold text-slate-500 uppercase">
          SPILLOVER CASCADE DYNAMICS
        </div>
        <div className="flex items-center justify-between text-center gap-1 font-bold text-[9px] sm:text-[10px]">
          <span className="text-amber-400">CONGESTION SEED</span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="text-cyan-400">UPSTREAM SPILLBACK</span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="text-purple-400">CONNECTED SEGMENTS</span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="text-rose-400">PROPAGATION RISK</span>
        </div>
      </div>

      {/* Selected Segment Cascade Status Banner (Requirement 11 & 16: NO ACTIVE PROPAGATION) */}
      {selectedSegmentId && (
        <div className="p-2.5 rounded-lg border bg-slate-950/90 border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">
              PROPAGATION STATUS &middot; {selectedSegmentId}
            </span>
            {matchingCascadeCount > 0 ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 border border-amber-500/60 text-amber-300">
                {matchingCascadeCount} ACTIVE CASCADE{matchingCascadeCount > 1 ? "S" : ""}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/60 text-emerald-300">
                NO ACTIVE PROPAGATION
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {matchingCascadeCount > 0
              ? `Corridor is linked to ${matchingCascadeCount} active spillback cascade pathway(s).`
              : `Zero active spillback cascade detected for ${selectedSegmentId} in current network telemetry.`}
          </p>
        </div>
      )}

      {/* 2. Quick KPI Row */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
          <span className="text-[9px] text-slate-500 block uppercase">CASCADES</span>
          <span className="text-sm font-bold text-slate-200">{totalRecords}</span>
        </div>
        <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-900/40">
          <span className="text-[9px] text-rose-400/70 block uppercase">HIGH RISK</span>
          <span className="text-sm font-bold text-rose-400">{riskCounts.high}</span>
        </div>
        <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-900/40">
          <span className="text-[9px] text-amber-400/70 block uppercase">MODERATE</span>
          <span className="text-sm font-bold text-amber-400">{riskCounts.moderate}</span>
        </div>
      </div>

      {/* 3. Loading State */}
      {loading && (
        <div className="py-8 text-center text-slate-400">
          <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading propagation intelligence...</p>
        </div>
      )}

      {/* 4. Error State */}
      {error && !loading && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-center space-y-2">
          <AlertTriangle className="w-5 h-5 text-rose-400 mx-auto" />
          <p className="text-xs text-rose-300">Propagation data unavailable</p>
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

      {/* 5. Cascade List Preview */}
      {!loading && !error && records.length > 0 && (
        <div className="space-y-1.5 overflow-y-auto max-h-[160px] pr-1">
          {records.slice(0, 5).map((rec, idx) => {
            const isSelected =
              selectedRecord?.seed_segment_id === rec.seed_segment_id &&
              selectedRecord?.propagated_segment_id === rec.propagated_segment_id;
            const badge = RISK_BADGES[rec.risk_level] || RISK_BADGES.LOW_RISK;

            return (
              <div
                key={`${rec.seed_segment_id}-${rec.propagated_segment_id}-${idx}`}
                onClick={() => {
                  onSelectRecord?.(rec);
                  onSelectSegment?.(rec.seed_segment_id);
                }}
                className={`p-2 rounded-lg border transition-all cursor-pointer text-xs flex flex-wrap items-center justify-between gap-2 ${
                  isSelected
                    ? "bg-cyan-950/60 border-cyan-500/60"
                    : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRecord?.(rec);
                      onSelectSegment?.(rec.seed_segment_id);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      selectedSegmentId === rec.seed_segment_id
                        ? "bg-amber-500/30 text-amber-300 border border-amber-500/60"
                        : "bg-amber-950/50 text-amber-400 hover:bg-amber-900/60 border border-amber-800/40"
                    }`}
                    title={`Select Seed: ${rec.seed_segment_id}`}
                  >
                    SEED: {rec.seed_segment_id}
                  </button>
                  <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRecord?.(rec);
                      onSelectSegment?.(rec.propagated_segment_id);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      selectedSegmentId === rec.propagated_segment_id
                        ? "bg-rose-500/30 text-rose-300 border border-rose-500/60"
                        : "bg-rose-950/50 text-rose-400 hover:bg-rose-900/60 border border-rose-800/40"
                    }`}
                    title={`Select Affected Target: ${rec.propagated_segment_id}`}
                  >
                    TARGET: {rec.propagated_segment_id}
                  </button>
                  <span className="text-[10px] text-slate-500 font-normal">
                    (+{rec.horizon_min}m)
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <span className="text-[10px] text-slate-400">
                    {typeof rec.propagation_score === "number" ? `${(rec.propagation_score * 100).toFixed(0)}%` : "—"}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold font-sans ${badge.bg} ${badge.text}`}
                  >
                    {badge.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Empty State */}
      {!loading && !error && records.length === 0 && (
        <div className="py-6 text-center text-xs text-slate-500">
          No propagation footprints detected.
        </div>
      )}

      {/* 7. Action Button: Open Full Propagation View */}
      {onOpenFullView && (
        <button
          onClick={onOpenFullView}
          className="w-full py-2 px-3 rounded-lg border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/50 text-xs font-mono text-cyan-300 transition-colors flex items-center justify-center gap-1.5"
        >
          <span>Open Full Propagation Intelligence</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Modeled disclaimer (Requirement 5) */}
      <p className="text-[9px] text-slate-500 font-mono text-center pt-1 border-t border-slate-800/60">
        Empirical cascade heuristics based on static network topology. Modeled risk advisory only — does not claim ground-truth propagation certainty.
      </p>
    </div>
  );
}
