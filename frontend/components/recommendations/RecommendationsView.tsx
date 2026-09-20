"use client";

import React, { useState, useMemo } from "react";
import {
  Lightbulb,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  ExternalLink,
  ShieldAlert,
  Clock,
  TrendingDown,
  Layers,
  MapPin,
} from "lucide-react";
import { RecommendationRecord } from "@/types/recommendations";
import { ProvenanceBadge } from "../ui/ProvenanceBadge";
import { RecommendationCard } from "./RecommendationCard";
import { EvidenceChain } from "./EvidenceChain";

interface RecommendationsViewProps {
  records: RecommendationRecord[];
  totalRecords: number;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  offset: number;
  limit: number;
  onPageChange: (newOffset: number) => void;
  urgencyFilter?: string;
  onUrgencyFilterChange: (urgency?: string) => void;
  tierFilter?: string;
  onTierFilterChange: (tier?: string) => void;
  selectedRecommendation?: RecommendationRecord | null;
  onSelectRecommendation?: (record: RecommendationRecord) => void;
  onLocateSegment?: (segmentId: string) => void;
}

export function RecommendationsView({
  records,
  totalRecords,
  loading = false,
  error,
  onRetry,
  offset,
  limit,
  onPageChange,
  urgencyFilter,
  onUrgencyFilterChange,
  tierFilter,
  onTierFilterChange,
  selectedRecommendation,
  onSelectRecommendation,
  onLocateSegment,
}: RecommendationsViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Filter records by search term
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const q = searchTerm.toLowerCase();
    return records.filter(
      (r) =>
        r.target_segment.toLowerCase().includes(q) ||
        r.action_type.toLowerCase().includes(q) ||
        r.candidate_id.toLowerCase().includes(q) ||
        r.primary_trigger_evidence.toLowerCase().includes(q)
    );
  }, [records, searchTerm]);

  // Active selected recommendation (default to first if none explicitly chosen)
  const activeRecord = useMemo(() => {
    if (selectedRecommendation) return selectedRecommendation;
    return filteredRecords.length > 0 ? filteredRecords[0] : null;
  }, [selectedRecommendation, filteredRecords]);

  // Summary counts strictly computed from real API data
  const summaryCounts = useMemo(() => {
    let critical = 0;
    let high = 0;
    let candidateActions = 0;

    for (const r of records) {
      if (r.urgency_level === "CRITICAL") critical++;
      if (r.urgency_level === "HIGH") high++;
      if (r.action_type !== "NO_CANDIDATE_AVAILABLE") candidateActions++;
    }

    return {
      activeAdvisories: totalRecords,
      critical,
      high,
      candidateActions,
    };
  }, [records, totalRecords]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Lightbulb className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-mono tracking-wider text-slate-100 uppercase">
                AI ADVISORY
              </h2>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                DECISION ENGINE ONLINE
              </span>
              <ProvenanceBadge type="DERIVED" size="sm" />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Evidence-driven traffic management recommendations &middot; Step 8 counterfactual &amp; Step 9 MCDA rankings
            </p>
          </div>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300 bg-slate-950 border border-slate-800 hover:text-white hover:border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            <span>Refresh Advisories</span>
          </button>
        )}
      </div>

      {/* 2. Summary KPI Cards (Strictly from real API response) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase block">
            ACTIVE ADVISORIES
          </span>
          <div className="text-2xl font-bold text-slate-100 mt-1">
            {summaryCounts.activeAdvisories}
          </div>
          <span className="text-[10px] text-slate-500">
            Verified candidate rankings
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <span className="text-[10px] text-rose-400/80 uppercase block">
            CRITICAL
          </span>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            {summaryCounts.critical}
          </div>
          <span className="text-[10px] text-slate-500">
            Immediate dispatch required
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <span className="text-[10px] text-orange-400/80 uppercase block">
            HIGH PRIORITY
          </span>
          <div className="text-2xl font-bold text-orange-400 mt-1">
            {summaryCounts.high}
          </div>
          <span className="text-[10px] text-slate-500">
            Rapid intervention recommended
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <span className="text-[10px] text-cyan-400/80 uppercase block">
            CANDIDATE ACTIONS
          </span>
          <div className="text-2xl font-bold text-cyan-400 mt-1">
            {summaryCounts.candidateActions}
          </div>
          <span className="text-[10px] text-slate-500">
            Actionable mitigations
          </span>
        </div>
      </div>

      {/* 3. Filters & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl font-mono text-xs">
        {/* Urgency Filter */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-slate-500 text-[10px] uppercase mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Urgency:
          </span>
          {(["ALL", "CRITICAL", "HIGH", "MEDIUM", "ADVISORY"] as const).map(
            (u) => {
              const active =
                (u === "ALL" && !urgencyFilter) || urgencyFilter === u;
              return (
                <button
                  key={u}
                  onClick={() =>
                    onUrgencyFilterChange(u === "ALL" ? undefined : u)
                  }
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                    active
                      ? "bg-slate-800 text-cyan-400 border border-cyan-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {u}
                </button>
              );
            }
          )}
        </div>

        {/* Tier Filter */}
        <div className="flex items-center gap-1">
          <span className="text-slate-500 text-[10px] uppercase mr-1">Tier:</span>
          <button
            onClick={() => onTierFilterChange(undefined)}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              !tierFilter
                ? "bg-slate-800 text-slate-100 font-bold border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => onTierFilterChange("TACTICAL_OPERATIONAL")}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              tierFilter === "TACTICAL_OPERATIONAL"
                ? "bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            TACTICAL
          </button>
          <button
            onClick={() => onTierFilterChange("STRATEGIC_CAPITAL")}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              tierFilter === "STRATEGIC_CAPITAL"
                ? "bg-purple-950 text-purple-300 font-bold border border-purple-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            STRATEGIC
          </button>
        </div>

        {/* Search Filter */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search segment or action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-52"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Primary Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Scrollable List of Recommendation Cards */}
        <div className="lg:col-span-5 space-y-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 px-1 text-xs text-slate-400">
            <span className="font-bold uppercase text-slate-300">
              ADVISORY QUEUE ({filteredRecords.length})
            </span>
            <span className="text-[10px] text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-14 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
              <p className="text-xs">Evaluating candidate interventions...</p>
              <p className="text-[10px] text-slate-500">
                Ranking decisions via Multi-Criteria Decision Analysis (MCDA)
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-center space-y-2">
              <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
              <p className="text-xs text-rose-300">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-3 py-1 rounded bg-rose-900 text-rose-200 hover:bg-rose-800 text-xs"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredRecords.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-500 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              No active advisories match the specified criteria.
            </div>
          )}

          {/* Cards List */}
          {!loading && !error && filteredRecords.length > 0 && (
            <div className="space-y-3 overflow-y-auto max-h-[640px] pr-1">
              {filteredRecords.map((rec, idx) => (
                <RecommendationCard
                  key={`${rec.target_segment}-${rec.action_type}-${idx}`}
                  recommendation={rec}
                  isSelected={
                    activeRecord?.target_segment === rec.target_segment &&
                    activeRecord?.action_type === rec.action_type
                  }
                  onSelect={(r) => onSelectRecommendation?.(r)}
                  onLocateSegment={onLocateSegment}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
            <span>
              Showing {offset + 1} - {Math.min(offset + limit, totalRecords)} of{" "}
              {totalRecords}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onPageChange(Math.max(0, offset - limit))}
                disabled={offset === 0 || loading}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPageChange(offset + limit)}
                disabled={offset + limit >= totalRecords || loading}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Deep Inspection & Evidence Chain */}
        <div className="lg:col-span-7 space-y-4 font-mono">
          {activeRecord ? (
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-5 shadow-2xl">
              {/* Inspection Header */}
              <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    RECOMMENDATION SPECIFICATION
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <h3 className="text-lg font-bold text-slate-100">
                      {activeRecord.action_type.replace(/_/g, " ")}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold border bg-slate-900 text-slate-300 border-slate-700">
                      {activeRecord.recommendation_tier}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <span>Corridor:</span>
                    <button
                      onClick={() => onLocateSegment?.(activeRecord.target_segment)}
                      className="text-cyan-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{activeRecord.target_segment}</span>
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase">MCDA SCORE</div>
                  <div className="text-xl font-bold text-cyan-400">
                    {activeRecord.mcda_score.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Expected Operational Impact Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">
                    DELAY RELIEF
                  </span>
                  <span className="text-base font-bold text-emerald-400 flex items-center justify-center gap-1 mt-1">
                    <TrendingDown className="w-4 h-4" />
                    {activeRecord.expected_delay_reduction_pct.toFixed(1)}%
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">
                    QUEUE DRAIN
                  </span>
                  <span className="text-base font-bold text-emerald-400 flex items-center justify-center gap-1 mt-1">
                    <TrendingDown className="w-4 h-4" />
                    {activeRecord.expected_queue_reduction_veh.toFixed(1)} veh
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">
                    FEEDERS SHIELDED
                  </span>
                  <span className="text-base font-bold text-cyan-400 flex items-center justify-center gap-1 mt-1">
                    <Layers className="w-4 h-4" />
                    {activeRecord.upstream_segments_protected} seg
                  </span>
                </div>
              </div>

              {/* Evidence Chain Component */}
              <EvidenceChain recommendation={activeRecord} />
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2 text-slate-500">
              <Lightbulb className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs font-bold uppercase">No Advisory Selected</p>
              <p className="text-[11px]">
                Select a recommendation from the queue to inspect its complete evidence chain.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
